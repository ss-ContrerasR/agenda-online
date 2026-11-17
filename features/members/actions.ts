"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { auditAction } from "@/lib/action-audit";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import { normalizeEmail } from "@/lib/utils";
import {
  addMemberSchema,
  parseAddMemberForm,
  setMemberActiveSchema,
  updateMemberRoleSchema,
} from "./schemas";

function revalidateMembers() {
  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard");
}

/** El trigger de Postgres lanza el texto en español; lo traducimos al código known. */
function memberError(error: unknown): string {
  if (
    error instanceof Error &&
    /propietario activo|protect_last_owner/i.test(error.message)
  ) {
    return "La organización debe conservar al menos un propietario activo.";
  }
  return getActionError(error);
}

function ownershipAudit(
  organizationId: string,
  userId: string,
  action: string,
  membershipId: string,
  metadata?: Record<string, string | boolean | null>,
) {
  return auditAction({
    organizationId,
    userId,
    action,
    entity: "organization_members",
    entityId: membershipId,
    metadata: metadata ?? {},
  });
}

export async function updateMemberRoleAction(
  membershipId: string,
  role: string,
): Promise<ActionResult> {
  const parsed = updateMemberRoleSchema.safeParse({ membershipId, role });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Rol no válido.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("users:manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("organization_members")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.membershipId)
      .eq("organization_id", session.membership.organization_id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("MEMBER_NOT_FOUND");

    await ownershipAudit(
      session.membership.organization_id,
      session.user.id,
      "member.role_updated",
      data.id,
      { role: parsed.data.role },
    );
    revalidateMembers();
    return { ok: true, message: "Rol actualizado correctamente." };
  } catch (error) {
    return { ok: false, error: memberError(error) };
  }
}

export async function setMemberActiveAction(
  membershipId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const parsed = setMemberActiveSchema.safeParse({ membershipId, isActive });
  if (!parsed.success) {
    return { ok: false, error: "Datos no válidos." };
  }

  try {
    const session = await requirePermission("users:manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("organization_members")
      .update({ is_active: parsed.data.isActive })
      .eq("id", parsed.data.membershipId)
      .eq("organization_id", session.membership.organization_id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("MEMBER_NOT_FOUND");

    await ownershipAudit(
      session.membership.organization_id,
      session.user.id,
      parsed.data.isActive ? "member.reactivated" : "member.deactivated",
      data.id,
      { is_active: parsed.data.isActive },
    );
    revalidateMembers();
    return {
      ok: true,
      message: parsed.data.isActive
        ? "Miembro reactivado."
        : "Miembro desactivado.",
    };
  } catch (error) {
    return { ok: false, error: memberError(error) };
  }
}

export async function removeMemberAction(
  membershipId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("users:manage");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", membershipId)
      .eq("organization_id", session.membership.organization_id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("MEMBER_NOT_FOUND");

    await ownershipAudit(
      session.membership.organization_id,
      session.user.id,
      "member.removed",
      data.id,
    );
    revalidateMembers();
    return { ok: true, message: "Miembro eliminado del equipo." };
  } catch (error) {
    return { ok: false, error: memberError(error) };
  }
}

/**
 * La búsqueda del perfil se hace con el cliente service-role porque RLS solo
 * permite ver perfiles de compañeros ya miembros. La inserción de la membresía
 * sí usa el cliente de sesión, para que RLS y la auditoría sigan aplicando.
 */
export async function addMemberByEmailAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addMemberSchema.safeParse(parseAddMemberForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del miembro.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("users:manage");
    const email = normalizeEmail(parsed.data.email);

    if (!isAdminClientConfigured()) {
      return {
        ok: false,
        error: "La búsqueda de usuarios no está disponible en este momento.",
      };
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return {
        ok: false,
        error:
          "No encontramos un usuario registrado con ese correo. Pídele que cree una cuenta primero.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { data: existing } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: "Ese usuario ya pertenece al equipo de esta organización.",
      };
    }

    const { data, error } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: profile.id,
        role: parsed.data.role,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("MEMBER_NOT_FOUND");

    await ownershipAudit(
      organizationId,
      session.user.id,
      "member.added",
      data.id,
      { role: parsed.data.role, email },
    );
    revalidateMembers();
    return {
      ok: true,
      message: `${profile.full_name ?? "El usuario"} se agregó al equipo.`,
    };
  } catch (error) {
    return { ok: false, error: memberError(error) };
  }
}

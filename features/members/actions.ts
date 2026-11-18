"use server";

import { randomUUID } from "node:crypto";
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
  createUserSchema,
  parseAddMemberForm,
  parseCreateUserForm,
  setMemberActiveSchema,
  updateMemberRoleSchema,
  type CreateUserInput,
} from "./schemas";

function revalidateMembers() {
  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/horarios");
  revalidatePath("/dashboard/citas");
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
    const { data: profile, error: searchError } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    // Si la SERVICE_ROLE_KEY no es válida, PostgREST responde 401. Antes ese
    // error se ignoraba y se decía "no encontramos usuario", que era engañoso.
    if (searchError) {
      console.error("No se pudo buscar el perfil del usuario", searchError);
      return {
        ok: false,
        error:
          "No se pudo buscar al usuario. Revisa SUPABASE_SERVICE_ROLE_KEY en el servidor e inténtalo de nuevo.",
      };
    }

    if (!profile) {
      return {
        ok: false,
        error:
          "No encontramos un usuario registrado con ese correo. Pídele que cree una cuenta primero o usa 'Crear nuevo'.",
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

/**
 * Crea una cuenta nueva (auth + perfil) y la vincula a la organización actual.
 * La contraseña temporal se devuelve al administrador para que se la entregue al
 * usuario por un canal seguro. Si algo falla después de crear el usuario de
 * Auth, se elimina para no dejar cuentas huérfanas.
 */
export async function createUserAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createUserSchema.safeParse(parseCreateUserForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del nuevo usuario.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const session = await requirePermission("users:manage");
  if (!isAdminClientConfigured()) {
    return {
      ok: false,
      error: "La creación de usuarios no está disponible en este momento.",
    };
  }

  const values: CreateUserInput = parsed.data;
  const email = normalizeEmail(values.email);
  const temporaryPassword =
    values.password || `Tmp-${randomUUID().replace(/-/g, "").slice(0, 10)}!`;
  const organizationId = session.membership.organization_id;
  let createdUserId: string | null = null;

  try {
    const admin = createSupabaseAdminClient();
    const { data: existing, error: searchError } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error("No se pudo verificar el correo del nuevo usuario", searchError);
      return {
        ok: false,
        error:
          "No se pudo verificar el correo. Revisa SUPABASE_SERVICE_ROLE_KEY en el servidor e inténtalo de nuevo.",
      };
    }

    if (existing) {
      return {
        ok: false,
        error:
          "Ya existe una cuenta con ese correo. Usa la opción 'Usuario existente' para agregarla al equipo.",
        fieldErrors: { email: "Este correo ya está registrado." },
      };
    }

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: values.fullName },
    });

    if (authError || !created.user) {
      const detail = authError?.message ?? "";
      if (/already exists|duplicate/i.test(detail)) {
        return {
          ok: false,
          error: "Ya existe una cuenta con ese correo electrónico.",
          fieldErrors: { email: "Este correo ya está registrado." },
        };
      }
      if (/jwt|token|unauthoriz|forbidden|403|401/i.test(detail)) {
        console.error("No se pudo crear la cuenta en Auth", authError);
        return {
          ok: false,
          error:
            "No se pudo crear la cuenta de acceso. Revisa SUPABASE_SERVICE_ROLE_KEY en el servidor (debe ser la service_role JWT, no una sb_secret_).",
        };
      }
      throw authError ?? new Error("No se pudo crear la cuenta de acceso.");
    }

    createdUserId = created.user.id;

    // El trigger `on_auth_user_created` ya inserta el perfil al crear el usuario
    // en Auth. Un `insert` simple aquí provocaba una violación de clave primaria
    // (y el mensaje genérico "Ocurrió un error inesperado"). El upsert cubre
    // ambos escenarios: trigger activo y base sin trigger.
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        full_name: values.fullName,
        email,
        phone: values.phone || null,
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    const supabase = await createSupabaseServerClient();
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: created.user.id,
        role: values.role,
        is_active: true,
      })
      .select("id")
      .single();

    if (membershipError || !membership) {
      throw membershipError ?? new Error("No se pudo vincular el usuario a la empresa.");
    }

    await ownershipAudit(
      organizationId,
      session.user.id,
      "member.created",
      membership.id,
      { email, role: values.role },
    );

    createdUserId = null;
    revalidateMembers();
    return {
      ok: true,
      message:
        values.role === "employee"
          ? `${values.fullName} ya puede iniciar sesión. Agrégale una ficha en Equipo → Agregar personal para asignarle citas.`
          : `${values.fullName} se agregó al equipo. Comparte la contraseña temporal solo con esa persona.`,
      data: { temporaryPassword, email },
    };
  } catch (error) {
    // Los errores de PostgREST son objetos planos: sin este log el diagnóstico
    // en el navegador solo mostraba el mensaje genérico.
    console.error("No se pudo crear el usuario", error);
    if (createdUserId) {
      const admin = createSupabaseAdminClient();
      const { error: cleanupError } = await admin.auth.admin.deleteUser(createdUserId);
      if (cleanupError) {
        console.error("No se pudo limpiar el usuario creado parcialmente", cleanupError);
      }
    }
    return { ok: false, error: memberError(error) };
  }
}

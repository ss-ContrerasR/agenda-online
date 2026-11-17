"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdminContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import { DEFAULT_SETTINGS } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import type {
  BillingStatus,
  MembershipStatus,
  ProfileRow,
} from "@/types/database";
import {
  createOrganizationSchema,
  reactivateOrganizationSchema,
  reactivateUserSchema,
  setMembershipStatusSchema,
  suspendOrganizationSchema,
  suspendUserSchema,
  updateOrganizationBillingSchema,
  type CreateOrganizationInput,
  type ReactivateOrganizationInput,
  type ReactivateUserInput,
  type SetMembershipStatusInput,
  type SuspendOrganizationInput,
  type SuspendUserInput,
  type UpdateOrganizationBillingInput,
} from "./schemas";

export type AdminActionResult<T = undefined> = ActionResult & { data?: T };

function validationResult(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): AdminActionResult {
  return {
    ok: false,
    error: "Revisa los datos ingresados.",
    fieldErrors: fieldErrorsFromZod(error.issues),
  };
}

function revalidatePlatform(paths: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/empresas");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/auditoria");
  revalidatePath("/dashboard");
  for (const path of new Set(paths)) revalidatePath(path);
}

async function recordAdminAudit(input: {
  organizationId: string | null;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("No se pudo registrar la auditoría de plataforma", error);
}

function dateInputToIso(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type SetUserSuspensionArgs = {
  p_user_id: string;
  p_suspended: boolean;
  p_reason?: string | null;
  p_until?: string | null;
  p_membership_status?: MembershipStatus | null;
  p_organization_id?: string | null;
  p_actor_id?: string | null;
};

type RpcResponse = { data: unknown; error: { message: string } | null };
type SuspensionRpc = (
  fn: "set_user_suspension",
  args: SetUserSuspensionArgs,
) => PromiseLike<RpcResponse>;

/**
 * El(service role) no tiene auth.uid(), por lo que la RPC puede rechazar la
 * llamada. Si ocurre, replicamos la misma operación con el cliente admin.
 */
async function applyUserSuspension(
  args: SetUserSuspensionArgs,
  actorId: string,
) {
  const admin = createSupabaseAdminClient();
  const rpcClient = admin as unknown as { rpc: SuspensionRpc };
  const { error } = await rpcClient.rpc("set_user_suspension", args);
  if (!error) return;

  const suspended = args.p_suspended;
  const nowIso = new Date().toISOString();
  const update: Partial<ProfileRow> = suspended
    ? {
        is_suspended: true,
        suspended_at: nowIso,
        suspended_until: args.p_until ?? null,
        suspended_reason: args.p_reason ?? null,
        suspended_by: actorId,
        membership_status:
          args.p_membership_status ??
          (args.p_until ? "past_due" : "suspended"),
      }
    : {
        is_suspended: false,
        suspended_at: null,
        suspended_until: null,
        suspended_reason: null,
        suspended_by: actorId,
        membership_status: args.p_membership_status ?? "active",
      };

  const { error: updateError } = await admin
    .from("profiles")
    .update(update)
    .eq("id", args.p_user_id);
  if (updateError) throw updateError;

  const { error: historyError } = await admin
    .from("user_suspension_history")
    .insert({
      user_id: args.p_user_id,
      organization_id: args.p_organization_id ?? null,
      action: suspended ? "suspended" : "reactivated",
      reason: args.p_reason ?? null,
      suspended_until: suspended ? args.p_until ?? null : null,
      actor_id: actorId,
    });
  if (historyError) throw historyError;
}

/** Refuerzo best-effort sobre Supabase Auth; nunca rompe la acción principal. */
async function syncAuthMetadata(userId: string, suspended: boolean) {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const current = data.user?.app_metadata ?? {};
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...current,
        platform_access: suspended ? "suspended" : "active",
      },
    });
  } catch (error) {
    console.warn("No se pudo sincronizar app_metadata del usuario", error);
  }
}

async function getUserPublicPaths(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: memberships } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(200);
  const ids = (memberships ?? []).map((row) => row.organization_id);
  if (ids.length === 0) return [];
  const { data: organizations } = await admin
    .from("organizations")
    .select("slug")
    .in("id", ids)
    .limit(200);
  return (organizations ?? []).map((row) => `/reservar/${row.slug}`);
}

export async function createOrganizationAction(
  input: CreateOrganizationInput,
): Promise<AdminActionResult<{ id: string }>> {
  const { user } = await requirePlatformAdminContext();
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  const values = parsed.data;
  const slug = slugify(values.slug) || values.slug;
  let createdAuthUserId: string | null = null;

  try {
    const admin = createSupabaseAdminClient();

    const { data: clash } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) {
      return {
        ok: false,
        error: "Ese identificador público ya está en uso.",
        fieldErrors: { slug: "Elige otro identificador público" },
      };
    }

    if (values.ownerEmail) {
      const email = values.ownerEmail.trim().toLowerCase();
      const { data: created, error: authError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: values.ownerName?.trim() || email.split("@")[0],
        },
      });
      if (authError || !created.user) {
        throw authError ?? new Error("No se pudo crear el usuario propietario.");
      }
      createdAuthUserId = created.user.id;
    }

    const { data: organization, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: values.name,
        slug,
        email: values.email || null,
        phone: values.phone || null,
        city: values.city || null,
        timezone: values.timezone,
        currency: values.currency,
        billing_status: "trialing",
      })
      .select("*")
      .single();
    if (orgError || !organization) {
      throw orgError ?? new Error("No se pudo crear la empresa.");
    }

    const { error: settingsError } = await admin
      .from("organization_settings")
      .insert({ organization_id: organization.id, ...DEFAULT_SETTINGS });
    if (settingsError) throw settingsError;

    await admin.from("business_hours").insert(
      Array.from({ length: 7 }, (_, weekday) => ({
        organization_id: organization.id,
        weekday,
        is_open: weekday !== 0,
        open_time: "09:00",
        close_time: "18:00",
        break_start: null,
        break_end: null,
      })),
    );

    if (createdAuthUserId) {
      const { error: profileError } = await admin.from("profiles").upsert({
        id: createdAuthUserId,
        full_name:
          values.ownerName?.trim() ||
          values.ownerEmail!.split("@")[0],
        email: values.ownerEmail!.trim().toLowerCase(),
      });
      if (profileError) throw profileError;

      const { error: memberError } = await admin
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: createdAuthUserId,
          role: "owner",
        });
      if (memberError) throw memberError;
    }

    await recordAdminAudit({
      organizationId: organization.id,
      userId: user.id,
      action: "superadmin.organization.created",
      entity: "organizations",
      entityId: organization.id,
      metadata: { name: organization.name, slug: organization.slug },
    });

    revalidatePlatform([`/admin/empresas/${organization.id}`, `/reservar/${slug}`]);
    return {
      ok: true,
      message: createdAuthUserId
        ? "Empresa creada con su propietario. Envía al usuario sus credenciales de acceso."
        : "Empresa creada correctamente.",
      data: { id: organization.id },
    };
  } catch (error) {
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupError) {
        console.warn("No se pudo revertir el usuario creado", cleanupError);
      }
    }
    return { ok: false, error: getActionError(error) };
  }
}

export async function suspendOrganizationAction(
  input: SuspendOrganizationInput,
): Promise<AdminActionResult> {
  const { user } = await requirePlatformAdminContext();
  const parsed = suspendOrganizationSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  try {
    const admin = createSupabaseAdminClient();
    const { data: organization } = await admin
      .from("organizations")
      .select("slug")
      .eq("id", parsed.data.organizationId)
      .maybeSingle();
    if (!organization) return { ok: false, error: "La empresa no existe." };

    const { error } = await admin
      .from("organizations")
      .update({
        is_active: false,
        billing_status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_reason: parsed.data.reason,
      })
      .eq("id", parsed.data.organizationId);
    if (error) throw error;

    await recordAdminAudit({
      organizationId: parsed.data.organizationId,
      userId: user.id,
      action: "superadmin.organization.suspended",
      entity: "organizations",
      entityId: parsed.data.organizationId,
      metadata: { reason: parsed.data.reason },
    });

    revalidatePlatform([
      `/admin/empresas/${parsed.data.organizationId}`,
      `/reservar/${organization.slug}`,
    ]);
    return { ok: true, message: "Empresa suspendida. Su página pública ya no acepta reservas." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function reactivateOrganizationAction(
  input: ReactivateOrganizationInput,
): Promise<AdminActionResult> {
  const { user } = await requirePlatformAdminContext();
  const parsed = reactivateOrganizationSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  try {
    const admin = createSupabaseAdminClient();
    const { data: organization } = await admin
      .from("organizations")
      .select("slug")
      .eq("id", parsed.data.organizationId)
      .maybeSingle();
    if (!organization) return { ok: false, error: "La empresa no existe." };

    const { error } = await admin
      .from("organizations")
      .update({
        is_active: true,
        billing_status: "active",
        suspended_at: null,
        suspended_reason: null,
      })
      .eq("id", parsed.data.organizationId);
    if (error) throw error;

    await recordAdminAudit({
      organizationId: parsed.data.organizationId,
      userId: user.id,
      action: "superadmin.organization.reactivated",
      entity: "organizations",
      entityId: parsed.data.organizationId,
    });

    revalidatePlatform([
      `/admin/empresas/${parsed.data.organizationId}`,
      `/reservar/${organization.slug}`,
    ]);
    return { ok: true, message: "Empresa reactivada correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function updateOrganizationBillingAction(
  input: UpdateOrganizationBillingInput,
): Promise<AdminActionResult> {
  const { user } = await requirePlatformAdminContext();
  const parsed = updateOrganizationBillingSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("organizations")
      .update({
        billing_status: parsed.data.billingStatus as BillingStatus,
        current_period_end: dateInputToIso(parsed.data.currentPeriodEnd),
      })
      .eq("id", parsed.data.organizationId);
    if (error) throw error;

    await recordAdminAudit({
      organizationId: parsed.data.organizationId,
      userId: user.id,
      action: "superadmin.organization.billing_updated",
      entity: "organizations",
      entityId: parsed.data.organizationId,
      metadata: {
        billingStatus: parsed.data.billingStatus,
        currentPeriodEnd: parsed.data.currentPeriodEnd ?? null,
      },
    });

    revalidatePlatform([`/admin/empresas/${parsed.data.organizationId}`]);
    return { ok: true, message: "Datos de facturación actualizados." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function suspendUserAction(
  input: SuspendUserInput,
): Promise<AdminActionResult> {
  const { user } = await requirePlatformAdminContext();
  const parsed = suspendUserSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  const { userId, reason, until, organizationId } = parsed.data;
  const untilIso = dateInputToIso(until);
  if (until && (!untilIso || new Date(untilIso).getTime() <= Date.now())) {
    return {
      ok: false,
      error: "La fecha de fin debe ser futura.",
      fieldErrors: { until: "Selecciona una fecha futura" },
    };
  }

  try {
    await applyUserSuspension(
      {
        p_user_id: userId,
        p_suspended: true,
        p_reason: reason,
        p_until: untilIso,
        // null => la RPC elige 'past_due' con fecha y 'suspended' sin fecha
        p_membership_status: null,
        p_organization_id: organizationId || null,
        p_actor_id: user.id,
      },
      user.id,
    );
    await syncAuthMetadata(userId, true);
    const publicPaths = await getUserPublicPaths(userId);

    await recordAdminAudit({
      organizationId: organizationId || null,
      userId: user.id,
      action: "superadmin.user.suspended",
      entity: "profiles",
      entityId: userId,
      metadata: { reason, until: untilIso },
    });

    revalidatePlatform([`/admin/usuarios/${userId}`, ...publicPaths]);
    return {
      ok: true,
      message: untilIso
        ? "Usuario suspendido temporalmente. El acceso se desbloqueará al vencer la fecha."
        : "Usuario suspendido. El acceso quedó bloqueado en todas las empresas.",
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function reactivateUserAction(
  input: ReactivateUserInput,
): Promise<AdminActionResult> {
  const { user } = await requirePlatformAdminContext();
  const parsed = reactivateUserSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  try {
    await applyUserSuspension(
      {
        p_user_id: parsed.data.userId,
        p_suspended: false,
        p_reason: "Reactivado desde la consola de plataforma",
        p_membership_status: "active",
        p_organization_id: parsed.data.organizationId || null,
        p_actor_id: user.id,
      },
      user.id,
    );
    await syncAuthMetadata(parsed.data.userId, false);
    const publicPaths = await getUserPublicPaths(parsed.data.userId);

    await recordAdminAudit({
      organizationId: parsed.data.organizationId || null,
      userId: user.id,
      action: "superadmin.user.reactivated",
      entity: "profiles",
      entityId: parsed.data.userId,
    });

    revalidatePlatform([`/admin/usuarios/${parsed.data.userId}`, ...publicPaths]);
    return { ok: true, message: "Acceso reactivado correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function setUserMembershipStatusAction(
  input: SetMembershipStatusInput,
): Promise<AdminActionResult> {
  const { user } = await requirePlatformAdminContext();
  const parsed = setMembershipStatusSchema.safeParse(input);
  if (!parsed.success) return validationResult(parsed.error);

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ membership_status: parsed.data.status as MembershipStatus })
      .eq("id", parsed.data.userId);
    if (error) throw error;

    await recordAdminAudit({
      organizationId: null,
      userId: user.id,
      action: "superadmin.user.membership_updated",
      entity: "profiles",
      entityId: parsed.data.userId,
      metadata: { membershipStatus: parsed.data.status },
    });

    revalidatePlatform([`/admin/usuarios/${parsed.data.userId}`]);
    return { ok: true, message: "Estado de membresía actualizado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

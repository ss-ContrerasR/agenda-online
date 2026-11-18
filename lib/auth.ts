import "server-only";

import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MemberRole,
  OrganizationRow,
  OrganizationSettingsRow,
  ProfileRow,
} from "@/types/database";
import { AppError } from "@/lib/errors";
import {
  getLicenseExpiresAt,
  isOrganizationSuspended,
} from "@/lib/license";
import { can, type Permission } from "@/lib/permissions";

export type SessionContext = {
  user: User;
  profile: ProfileRow | null;
  membership: {
    id: string;
    organization_id: string;
    role: MemberRole;
    employee_id: string | null;
  };
  organization: OrganizationRow;
  settings: OrganizationSettingsRow;
  isPlatformAdmin: boolean;
};

export type PlatformAdminContext = {
  user: User;
  profile: ProfileRow | null;
};

/** Duración de la caché privada de sesión: se guarda solo en el navegador. */
const SESSION_CACHE = { stale: 30, revalidate: 60, expire: 300 } as const;

export const DEFAULT_SETTINGS: Omit<
  OrganizationSettingsRow,
  "organization_id" | "created_at" | "updated_at"
> = {
  confirmation_mode: "automatic",
  min_notice_minutes: 120,
  slot_interval_minutes: 15,
  max_advance_days: 60,
  buffer_minutes: 0,
  cancellation_notice_hours: 24,
  reschedule_notice_hours: 12,
  policy_text: null,
  allow_employee_selection: true,
  show_prices: true,
  show_employees: true,
  email_notifications: true,
  reminder_hours: 24,
  brand_primary: "#0F766E",
  brand_secondary: "#0EA5E9",
  brand_accent: "#F59E0B",
  theme_preset: "teal",
  dark_mode_enabled: true,
  public_theme: "system",
  public_hero_url: null,
  public_about: null,
  socials: {},
  seo_title: null,
  seo_description: null,
};

/**
 * La sesión de Supabase valida el token comparando su expiración con la hora
 * actual (Date.now dentro de auth-js). Con Cache Components ese valor no puede
 * formar parte del HTML prerenderizado: `'use cache: private'` ejecuta la lectura
 * en tiempo de petición y la mantiene únicamente en la caché del navegador.
 */
export async function getCurrentUser(): Promise<User | null> {
  "use cache: private";
  cacheLife(SESSION_CACHE);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function isProfileSuspended(profile: ProfileRow | null | undefined) {
  if (!profile) return false;
  const until = profile.suspended_until
    ? new Date(profile.suspended_until).getTime()
    : null;
  const temporarySuspension =
    (profile.is_suspended || until !== null) &&
    (until === null || until > Date.now());

  return (
    temporarySuspension ||
    profile.membership_status === "suspended" ||
    profile.membership_status === "cancelled"
  );
}

export async function getSessionContext(): Promise<SessionContext | null> {
  "use cache: private";
  cacheLife(SESSION_CACHE);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id, organization_id, role, employee_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [{ data: profile }, { data: platformAdmin }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (isProfileSuspended(profile)) redirect("/suspendido");

  if (!membership) {
    return null;
  }

  const [{ data: organization }, { data: settings }] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .maybeSingle(),
    supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
  ]);

  if (!organization) return null;

  if (isOrganizationSuspended(organization)) {
    const params = new URLSearchParams({ org: organization.name });
    const expiresAt = getLicenseExpiresAt(organization);
    if (expiresAt) params.set("expires", expiresAt);
    redirect(`/suspendido?${params.toString()}`);
  }

  return {
    user,
    profile: profile ?? null,
    membership: {
      id: membership.id,
      organization_id: membership.organization_id,
      role: membership.role,
      employee_id: membership.employee_id,
    },
    organization,
    settings: {
      organization_id: organization.id,
      ...DEFAULT_SETTINGS,
      ...(settings ?? {}),
      created_at: settings?.created_at ?? organization.created_at,
      updated_at: settings?.updated_at ?? organization.updated_at,
    },
    isPlatformAdmin: Boolean(platformAdmin),
  };
}

/** Contexto del superadministrador, con o sin membresía en una organización. */
export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  "use cache: private";
  cacheLife(SESSION_CACHE);

  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: admin }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!admin) return null;
  if (isProfileSuspended(profile)) redirect("/suspendido");

  return { user, profile: profile ?? null };
}

/** Compatibilidad con el panel existente. */
export async function getPlatformAdminUser(): Promise<User | null> {
  const context = await getPlatformAdminContext();
  return context?.user ?? null;
}

export async function requireSession(): Promise<SessionContext> {
  // La sesión de Supabase compara la expiración del token con la hora actual.
  // `connection()` detiene el prerender antes de llegar a auth-js, de modo que
  // esas lecturas (y cualquier `new Date()` posterior) ocurren por petición.
  await connection();
  const session = await getSessionContext();
  if (!session) redirect("/login");
  return session;
}

export async function requireSessionOrOnboarding(): Promise<SessionContext | null> {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const session = await getSessionContext();
  if (!session) redirect("/onboarding");
  return session;
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionContext> {
  const session = await requireSession();
  if (!can(session.membership.role, permission)) {
    // Una cuenta con rol Empleado que todavía no tiene ficha en Equipo no debe
    // terminar en una pantalla de error. Vuelve al resumen, donde se explica
    // cómo vincularla, en lugar de mostrar un "No tienes permisos" genérico.
    if (
      session.membership.role === "employee" &&
      !session.membership.employee_id
    ) {
      redirect("/dashboard");
    }

    throw new AppError(
      "FORBIDDEN",
      "No tienes permisos para realizar esta acción.",
    );
  }
  return session;
}

export async function requireRoles(
  roles: MemberRole[],
): Promise<SessionContext> {
  const session = await requireSession();
  if (!roles.includes(session.membership.role)) {
    throw new AppError(
      "FORBIDDEN",
      "No tienes permisos para realizar esta acción.",
    );
  }
  return session;
}

export async function requirePlatformAdmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) redirect("/dashboard");
  return session;
}

/** Autorización para las rutas /admin (no exige pertenecer a una empresa). */
export async function requirePlatformAdminContext(): Promise<PlatformAdminContext> {
  await connection();
  const context = await getPlatformAdminContext();
  if (!context) redirect("/dashboard");
  return context;
}

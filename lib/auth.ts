import "server-only";

import { cache } from "react";
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

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
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
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

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
  },
);

export const getPlatformAdminUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? user : null;
});

export async function requireSession(): Promise<SessionContext> {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  return session;
}

export async function requireSessionOrOnboarding(): Promise<SessionContext | null> {
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

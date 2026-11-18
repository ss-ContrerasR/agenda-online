import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PageParams } from "@/lib/pagination";
import type {
  AuditLogRow,
  BillingStatus,
  MemberRole,
  MembershipStatus,
  OrganizationMemberRow,
  OrganizationRow,
  ProfileRow,
  UserSuspensionHistoryRow,
} from "@/types/database";
import { getAccessState, isUserBlocked, type AccessState } from "./constants";

export type PlatformMetrics = {
  organizations: number;
  activeOrganizations: number;
  users: number;
  appointments: number;
  monthRevenue: number;
  suspendedUsers: number;
  pastDueUsers: number;
  inactiveOrganizations: number;
};

export type OrganizationListItem = OrganizationRow & {
  members: number;
  appointments: number;
};

export type OrganizationMemberDetail = {
  membership: OrganizationMemberRow;
  profile: ProfileRow | null;
};

export type OrganizationDetail = {
  organization: OrganizationRow;
  members: OrganizationMemberDetail[];
  stats: {
    members: number;
    appointments: number;
    services: number;
    revenue: number;
    blockedMembers: number;
  };
  history: Array<
    UserSuspensionHistoryRow & { actorName: string | null; userName: string | null }
  >;
};

export type UserOrganization = {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
  isActive: boolean;
};

export type UserListItem = ProfileRow & {
  organizations: UserOrganization[];
  isAdmin: boolean;
  lastActivity: string | null;
  canAccess: boolean;
  accessStatus: AccessState;
};

export type UserDetail = {
  profile: ProfileRow;
  organizations: UserOrganization[];
  isAdmin: boolean;
  lastActivity: string | null;
  history: Array<UserSuspensionHistoryRow & { organizationName: string | null; actorName: string | null }>;
  audit: Array<AuditLogRow & { organizationName: string | null }>;
};

export type AuditLogListItem = AuditLogRow & {
  actorName: string | null;
  organizationName: string | null;
};

type MembershipLite = Pick<
  OrganizationMemberRow,
  "user_id" | "organization_id" | "role" | "is_active"
>;

function escapeLike(value: string) {
  return `%${value.replace(/[%_]/g, "")}%`;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();

  const [
    organizations,
    activeOrganizations,
    inactiveOrganizations,
    users,
    appointments,
    suspendedUsers,
    pastDueUsers,
    revenueRows,
  ] = await Promise.all([
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_suspended", true),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("membership_status", ["suspended", "cancelled"]),
    admin
      .from("appointments")
      .select("price")
      .gte("starts_at", monthStart)
      .in("status", ["confirmed", "completed"])
      .is("deleted_at", null)
      .limit(10000),
  ]);

  return {
    organizations: organizations.count ?? 0,
    activeOrganizations: activeOrganizations.count ?? 0,
    inactiveOrganizations: inactiveOrganizations.count ?? 0,
    users: users.count ?? 0,
    appointments: appointments.count ?? 0,
    suspendedUsers: suspendedUsers.count ?? 0,
    pastDueUsers: pastDueUsers.count ?? 0,
    monthRevenue: (revenueRows.data ?? []).reduce(
      (sum, row) => sum + Number(row.price),
      0,
    ),
  };
}

export async function getRecentOrganizations(limit = 6) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listOrganizations(options: {
  page: PageParams;
  search?: string;
  billing?: string;
  active?: string;
}): Promise<{ items: OrganizationListItem[]; total: number }> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("organizations").select("*", { count: "exact" });

  const search = options.search?.trim();
  if (search) {
    const term = escapeLike(search);
    query = query.or(`name.ilike.${term},slug.ilike.${term},email.ilike.${term}`);
  }
  if (options.billing && options.billing !== "all") {
    query = query.eq("billing_status", options.billing as BillingStatus);
  }
  if (options.active === "active") query = query.eq("is_active", true);
  if (options.active === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(options.page.from, options.page.to);
  if (error) throw error;

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const [membersRes, appointmentsRes] = await Promise.all([
    ids.length
      ? admin
          .from("organization_members")
          .select("organization_id")
          .in("organization_id", ids)
          .limit(20000)
      : Promise.resolve({ data: [] as Array<{ organization_id: string }> }),
    ids.length
      ? admin
          .from("appointments")
          .select("organization_id")
          .in("organization_id", ids)
          .is("deleted_at", null)
          .limit(50000)
      : Promise.resolve({ data: [] as Array<{ organization_id: string }> }),
  ]);

  const memberCounts = new Map<string, number>();
  for (const row of membersRes.data ?? []) {
    memberCounts.set(row.organization_id, (memberCounts.get(row.organization_id) ?? 0) + 1);
  }
  const appointmentCounts = new Map<string, number>();
  for (const row of appointmentsRes.data ?? []) {
    appointmentCounts.set(
      row.organization_id,
      (appointmentCounts.get(row.organization_id) ?? 0) + 1,
    );
  }

  return {
    items: rows.map((row) => ({
      ...row,
      members: memberCounts.get(row.id) ?? 0,
      appointments: appointmentCounts.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

/** Todas las empresas con datos de licencia, ordenadas por vencimiento. */
export async function listLicenseOrganizations(search?: string): Promise<{
  items: OrganizationRow[];
  total: number;
}> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("organizations").select("*", { count: "exact" });
  const term = search?.trim();
  if (term) {
    const like = escapeLike(term);
    query = query.or(`name.ilike.${like},slug.ilike.${like},email.ilike.${like}`);
  }
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;

  const items = (data ?? []).sort((a, b) => {
    const aTime = a.license_expires_at ?? a.current_period_end;
    const bTime = b.license_expires_at ?? b.current_period_end;
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  return { items, total: count ?? items.length };
}

export async function getOrganizationById(
  id: string,
): Promise<OrganizationDetail | null> {
  const admin = createSupabaseAdminClient();
  const { data: organization, error } = await admin
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!organization) return null;

  const [membersRes, appointmentsRes, servicesRes, historyRes] = await Promise.all([
    admin
      .from("organization_members")
      .select("*")
      .eq("organization_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
    admin
      .from("appointments")
      .select("price")
      .eq("organization_id", id)
      .is("deleted_at", null)
      .limit(20000),
    admin
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", id)
      .is("deleted_at", null),
    admin
      .from("user_suspension_history")
      .select("*")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const memberships = membersRes.data ?? [];
  const userIds = Array.from(new Set(memberships.map((row) => row.user_id)));
  const actorIds = Array.from(
    new Set((historyRes.data ?? []).map((row) => row.actor_id).filter((value): value is string => Boolean(value))),
  );
  const historyUserIds = Array.from(
    new Set((historyRes.data ?? []).map((row) => row.user_id)),
  );
  const nameIds = Array.from(new Set([...userIds, ...actorIds, ...historyUserIds]));

  const [profilesRes, namesRes] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("*").in("id", userIds).limit(500)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    nameIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", nameIds).limit(500)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; email: string | null }> }),
  ]);

  const profileById = new Map((profilesRes.data ?? []).map((row) => [row.id, row]));
  const nameById = new Map(
    (namesRes.data ?? []).map((row) => [row.id, row.full_name || row.email || row.id.slice(0, 8)]),
  );
  const members: OrganizationMemberDetail[] = memberships.map((membership) => ({
    membership,
    profile: profileById.get(membership.user_id) ?? null,
  }));

  const appointments = appointmentsRes.data ?? [];

  return {
    organization,
    members,
    stats: {
      members: members.length,
      appointments: appointments.length,
      services: servicesRes.count ?? 0,
      revenue: appointments.reduce((sum, row) => sum + Number(row.price), 0),
      blockedMembers: members.filter((member) =>
        member.profile ? isUserBlocked(member.profile) : false,
      ).length,
    },
    history: (historyRes.data ?? []).map((row) => ({
      ...row,
      actorName: row.actor_id ? nameById.get(row.actor_id) ?? null : null,
      userName: nameById.get(row.user_id) ?? null,
    })),
  };
}

export async function listOrganizationsForFilter() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, name, slug")
    .order("name", { ascending: true })
    .limit(2000);
  if (error) throw error;
  return data ?? [];
}

export async function listUsers(options: {
  page: PageParams;
  search?: string;
  status?: string;
  organizationId?: string;
  role?: string;
  activity?: string;
  membership?: string;
}): Promise<{ items: UserListItem[]; total: number }> {
  const admin = createSupabaseAdminClient();
  const now = Date.now();
  let query = admin.from("profiles").select("*");

  const search = options.search?.trim();
  if (search) {
    const term = escapeLike(search);
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const { data: profiles, error } = await query
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;

  const rows = profiles ?? [];
  const ids = rows.map((row) => row.id);

  const [membersRes, orgsRes, adminsRes, activityRes] = await Promise.all([
    ids.length
      ? admin
          .from("organization_members")
          .select("user_id, organization_id, role, is_active")
          .in("user_id", ids)
          .limit(20000)
      : Promise.resolve({ data: [] as MembershipLite[] }),
    admin.from("organizations").select("id, name, slug").limit(2000),
    admin.from("platform_admins").select("user_id").limit(2000),
    ids.length
      ? admin
          .from("audit_logs")
          .select("user_id, created_at")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
          .limit(20000)
      : Promise.resolve({ data: [] as Array<{ user_id: string; created_at: string }> }),
  ]);

  const orgById = new Map((orgsRes.data ?? []).map((row) => [row.id, row]));
  const membershipsByUser = new Map<string, MembershipLite[]>();
  for (const row of membersRes.data ?? []) {
    const list = membershipsByUser.get(row.user_id) ?? [];
    list.push(row);
    membershipsByUser.set(row.user_id, list);
  }
  const adminIds = new Set((adminsRes.data ?? []).map((row) => row.user_id));
  const lastActivityByUser = new Map<string, string>();
  for (const row of activityRes.data ?? []) {
    if (row.user_id && !lastActivityByUser.has(row.user_id)) {
      lastActivityByUser.set(row.user_id, row.created_at);
    }
  }

  const enriched: UserListItem[] = rows.map((profile) => {
    const organizations = (membershipsByUser.get(profile.id) ?? [])
      .map((membership) => {
        const org = orgById.get(membership.organization_id);
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: membership.role,
          isActive: membership.is_active,
        } satisfies UserOrganization;
      })
      .filter((value): value is UserOrganization => value !== null);

    const blocked = isUserBlocked(profile, now);
    const accessStatus = getAccessState(profile, now);

    return {
      ...profile,
      organizations,
      isAdmin: adminIds.has(profile.id),
      lastActivity: lastActivityByUser.get(profile.id) ?? null,
      canAccess: !blocked,
      accessStatus,
    };
  });

  let filtered = enriched;
  if (options.status && options.status !== "all") {
    filtered = filtered.filter((item) => item.accessStatus === options.status);
  }
  if (options.membership && options.membership !== "all") {
    filtered = filtered.filter(
      (item) => item.membership_status === (options.membership as MembershipStatus),
    );
  }
  if (options.organizationId) {
    filtered = filtered.filter((item) =>
      item.organizations.some((org) => org.id === options.organizationId),
    );
  }
  if (options.role && options.role !== "all") {
    if (options.role === "superadmin") {
      filtered = filtered.filter((item) => item.isAdmin);
    } else {
      filtered = filtered.filter((item) =>
        item.organizations.some((org) => org.role === (options.role as MemberRole)),
      );
    }
  }
  if (options.activity && options.activity !== "all") {
    filtered = filtered.filter((item) => {
      if (options.activity === "never") return !item.lastActivity;
      if (!item.lastActivity) return false;
      const elapsed = now - new Date(item.lastActivity).getTime();
      if (options.activity === "recent") return elapsed <= 7 * 24 * 60 * 60 * 1000;
      if (options.activity === "inactive") return elapsed > 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }

  return {
    items: filtered.slice(options.page.from, options.page.from + options.page.pageSize),
    total: filtered.length,
  };
}

export async function getUserById(id: string): Promise<UserDetail | null> {
  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const [membersRes, orgsRes, adminRes, historyRes, auditRes] = await Promise.all([
    admin
      .from("organization_members")
      .select("user_id, organization_id, role, is_active")
      .eq("user_id", id)
      .limit(200),
    admin.from("organizations").select("id, name, slug").limit(2000),
    admin.from("platform_admins").select("user_id").eq("user_id", id).maybeSingle(),
    admin
      .from("user_suspension_history")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("audit_logs")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const orgById = new Map((orgsRes.data ?? []).map((row) => [row.id, row]));
  const organizations = (membersRes.data ?? [])
    .map((membership) => {
      const org = orgById.get(membership.organization_id);
      if (!org) return null;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: membership.role,
        isActive: membership.is_active,
      } satisfies UserOrganization;
    })
    .filter((value): value is UserOrganization => value !== null);

  const actorIds = Array.from(
    new Set([
      ...(historyRes.data ?? []).map((row) => row.actor_id).filter((value): value is string => Boolean(value)),
    ]),
  );
  const actorsRes = actorIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", actorIds).limit(200)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const actorById = new Map((actorsRes.data ?? []).map((row) => [row.id, row.full_name]));

  return {
    profile,
    organizations,
    isAdmin: Boolean(adminRes.data),
    lastActivity: (auditRes.data ?? [])[0]?.created_at ?? null,
    history: (historyRes.data ?? []).map((row) => ({
      ...row,
      organizationName: row.organization_id
        ? orgById.get(row.organization_id)?.name ?? null
        : null,
      actorName: row.actor_id ? actorById.get(row.actor_id) ?? null : null,
    })),
    audit: (auditRes.data ?? []).map((row) => ({
      ...row,
      organizationName: row.organization_id
        ? orgById.get(row.organization_id)?.name ?? null
        : null,
    })),
  };
}

export async function listAuditLogs(options: {
  page: PageParams;
  action?: string;
  search?: string;
}): Promise<{ items: AuditLogListItem[]; total: number }> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("audit_logs").select("*", { count: "exact" });

  if (options.action && options.action !== "all") {
    query = query.eq("action", options.action);
  }
  const search = options.search?.trim();
  if (search) {
    const term = escapeLike(search);
    query = query.or(`action.ilike.${term},entity.ilike.${term}`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(options.page.from, options.page.to);
  if (error) throw error;

  const rows = data ?? [];
  const userIds = Array.from(
    new Set(rows.map((row) => row.user_id).filter((value): value is string => Boolean(value))),
  );
  const orgIds = Array.from(
    new Set(
      rows
        .map((row) => row.organization_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [usersRes, orgsRes] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id, full_name").in("id", userIds).limit(200)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    orgIds.length
      ? admin.from("organizations").select("id, name").in("id", orgIds).limit(200)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const userById = new Map((usersRes.data ?? []).map((row) => [row.id, row.full_name]));
  const orgById = new Map((orgsRes.data ?? []).map((row) => [row.id, row.name]));

  return {
    items: rows.map((row) => ({
      ...row,
      actorName: row.user_id ? userById.get(row.user_id) ?? null : null,
      organizationName: row.organization_id ? orgById.get(row.organization_id) ?? null : null,
    })),
    total: count ?? 0,
  };
}

export async function listAuditActions() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select("action")
    .order("action", { ascending: true })
    .limit(3000);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.action)));
}

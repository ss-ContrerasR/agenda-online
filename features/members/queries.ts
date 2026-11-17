import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrganizationMemberRow, ProfileRow } from "@/types/database";

export type MemberWithProfile = OrganizationMemberRow & {
  profile: ProfileRow | null;
};

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Miembros de la organización con los datos de su perfil. */
export async function getMembersData(
  supabase: SupabaseServer,
  organizationId: string,
): Promise<MemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!members?.length) return [];

  const userIds = members.map((member) => member.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  return members.map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) ?? null,
  }));
}

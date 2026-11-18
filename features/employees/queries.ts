import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  EmployeeRow,
  EmployeeServiceRow,
  ServiceRow,
} from "@/types/database";

export type EmployeesData = {
  employees: EmployeeRow[];
  services: ServiceRow[];
  links: EmployeeServiceRow[];
};

export type EmployeeCandidate = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
};

/**
 * Cuentas con rol Empleado que todavía no tienen ficha en Equipo. Son los
 * profesionales que se pueden agregar como personal desde esta sección.
 */
export async function getEmployeeCandidates(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<EmployeeCandidate[]> {
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("id, user_id")
    .eq("organization_id", organizationId)
    .eq("role", "employee")
    .eq("is_active", true)
    .is("employee_id", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!members?.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .in("id", members.map((member) => member.user_id));

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  return members.map((member) => {
    const profile = profilesById.get(member.user_id);
    return {
      membershipId: member.id,
      userId: member.user_id,
      fullName: profile?.full_name ?? "Usuario sin perfil",
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    };
  });
}

export async function getEmployeesData(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  search?: string,
): Promise<EmployeesData> {
  let query = supabase
    .from("employees")
    .select("*")
    .eq("organization_id", organizationId)
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  const term = search?.trim();
  if (term) {
    const pattern = `%${term.replace(/[%_]/g, "")}%`;
    query = query.or(
      `full_name.ilike.${pattern},email.ilike.${pattern},position.ilike.${pattern}`,
    );
  }

  const [employees, services, links] = await Promise.all([
    query,
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("employee_services")
      .select("*")
      .eq("organization_id", organizationId),
  ]);

  return {
    employees: employees.data ?? [],
    services: services.data ?? [],
    links: links.data ?? [],
  };
}

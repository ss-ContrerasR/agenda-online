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

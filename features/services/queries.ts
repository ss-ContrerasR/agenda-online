import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  EmployeeRow,
  EmployeeServiceRow,
  ServiceCategoryRow,
  ServiceRow,
} from "@/types/database";

export type CatalogData = {
  categories: ServiceCategoryRow[];
  services: ServiceRow[];
  employees: EmployeeRow[];
  links: EmployeeServiceRow[];
};

export async function getCatalog(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<CatalogData> {
  const [categories, services, employees, links] = await Promise.all([
    supabase
      .from("service_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("employees")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("employee_services")
      .select("*")
      .eq("organization_id", organizationId),
  ]);

  return {
    categories: categories.data ?? [],
    services: services.data ?? [],
    employees: employees.data ?? [],
    links: links.data ?? [],
  };
}

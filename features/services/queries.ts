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

export type CategoryOverview = ServiceCategoryRow & {
  service_count: number;
  active_service_count: number;
};

export type CategoryOverviewData = {
  categories: CategoryOverview[];
  uncategorized_count: number;
};

export async function getCategoryOverview(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<CategoryOverviewData> {
  const [categories, services] = await Promise.all([
    supabase
      .from("service_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
    supabase
      .from("services")
      .select("id, category_id, is_active")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
  ]);

  const counts = new Map<string, { total: number; active: number }>();
  const activeCategoryIds = new Set(
    (categories.data ?? []).map((category) => category.id),
  );
  let uncategorized = 0;

  for (const service of services.data ?? []) {
    if (!service.category_id || !activeCategoryIds.has(service.category_id)) {
      uncategorized += 1;
      continue;
    }
    const entry = counts.get(service.category_id) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (service.is_active) entry.active += 1;
    counts.set(service.category_id, entry);
  }

  return {
    categories: (categories.data ?? []).map((category) => ({
      ...category,
      service_count: counts.get(category.id)?.total ?? 0,
      active_service_count: counts.get(category.id)?.active ?? 0,
    })),
    uncategorized_count: uncategorized,
  };
}

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

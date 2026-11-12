import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppointmentRow,
  AppointmentStatus,
  AppointmentStatusHistoryRow,
  ClientRow,
  Database,
  EmployeeRow,
  EmployeeServiceRow,
  ServiceRow,
} from "@/types/database";
import type { PageParams } from "@/lib/pagination";

export type AppointmentWithRelations = AppointmentRow & {
  client: ClientRow | null;
  service: ServiceRow | null;
  employee: EmployeeRow | null;
};

export type AppointmentLookups = {
  clients: ClientRow[];
  services: ServiceRow[];
  employees: EmployeeRow[];
  employeeServices: EmployeeServiceRow[];
};

export type AppointmentFilters = {
  status?: AppointmentStatus;
  employeeId?: string;
  serviceId?: string;
  search?: string;
};

export async function getAppointmentLookups(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<AppointmentLookups> {
  const [clients, services, employees, employeeServices] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .limit(1000),
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("employees")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    supabase
      .from("employee_services")
      .select("*")
      .eq("organization_id", organizationId),
  ]);

  return {
    clients: clients.data ?? [],
    services: services.data ?? [],
    employees: employees.data ?? [],
    employeeServices: employeeServices.data ?? [],
  };
}

async function attachRelations(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  rows: AppointmentRow[],
): Promise<AppointmentWithRelations[]> {
  if (rows.length === 0) return [];

  const unique = (values: string[]) => Array.from(new Set(values));
  const clientIds = unique(rows.map((row) => row.client_id));
  const serviceIds = unique(rows.map((row) => row.service_id));
  const employeeIds = unique(rows.map((row) => row.employee_id));

  const [clients, services, employees] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .in("id", clientIds),
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", organizationId)
      .in("id", serviceIds),
    supabase
      .from("employees")
      .select("*")
      .eq("organization_id", organizationId)
      .in("id", employeeIds),
  ]);

  const clientMap = new Map((clients.data ?? []).map((row) => [row.id, row]));
  const serviceMap = new Map((services.data ?? []).map((row) => [row.id, row]));
  const employeeMap = new Map((employees.data ?? []).map((row) => [row.id, row]));

  return rows.map((row) => ({
    ...row,
    client: clientMap.get(row.client_id) ?? null,
    service: serviceMap.get(row.service_id) ?? null,
    employee: employeeMap.get(row.employee_id) ?? null,
  }));
}

export async function listAppointments(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  options: {
    page: PageParams;
    start: string;
    end: string;
    filters: AppointmentFilters;
  },
): Promise<{ items: AppointmentWithRelations[]; total: number }> {
  let clientIds: string[] | null = null;
  const search = options.filters.search?.trim();
  if (search) {
    const term = `%${search.replace(/[%_]/g, "")}%`;
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
      .limit(200);
    clientIds = (clients ?? []).map((row) => row.id);
    if (clientIds.length === 0) return { items: [], total: 0 };
  }

  let query = supabase
    .from("appointments")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("starts_at", options.start)
    .lt("starts_at", options.end);

  if (options.filters.status) query = query.eq("status", options.filters.status);
  if (options.filters.employeeId) query = query.eq("employee_id", options.filters.employeeId);
  if (options.filters.serviceId) query = query.eq("service_id", options.filters.serviceId);
  if (clientIds) query = query.in("client_id", clientIds);

  const { data, count, error } = await query
    .order("starts_at", { ascending: true })
    .range(options.page.from, options.page.to);

  if (error) throw error;

  return {
    items: await attachRelations(supabase, organizationId, data ?? []),
    total: count ?? 0,
  };
}

export async function getAppointmentsInRange(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  start: string,
  end: string,
  filters: AppointmentFilters = {},
): Promise<AppointmentWithRelations[]> {
  let query = supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("starts_at", start)
    .lt("starts_at", end);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.serviceId) query = query.eq("service_id", filters.serviceId);

  const { data, error } = await query
    .order("starts_at", { ascending: true })
    .limit(1000);

  if (error) throw error;
  return attachRelations(supabase, organizationId, data ?? []);
}

export async function getAppointmentById(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  appointmentId: string,
): Promise<{
  appointment: AppointmentWithRelations;
  history: AppointmentStatusHistoryRow[];
} | null> {
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  const [withRelations, history] = await Promise.all([
    attachRelations(supabase, organizationId, [data]),
    supabase
      .from("appointment_status_history")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    appointment: withRelations[0],
    history: history.data ?? [],
  };
}

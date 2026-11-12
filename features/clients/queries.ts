import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AppointmentRow,
  ClientRow,
  Database,
  EmployeeRow,
  ServiceRow,
} from "@/types/database";
import type { PageParams } from "@/lib/pagination";

export type ClientWithStats = ClientRow & {
  appointments: number;
  lastVisit: string | null;
  totalSpent: number;
  upcoming: number;
};

export type ClientAppointment = AppointmentRow & {
  service: ServiceRow | null;
  employee: EmployeeRow | null;
};

async function statsFor(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  clientIds: string[],
) {
  const empty = new Map<string, { appointments: number; lastVisit: string | null; totalSpent: number; upcoming: number }>();
  if (clientIds.length === 0) return empty;

  const { data } = await supabase
    .from("appointments")
    .select("client_id, starts_at, status, price")
    .eq("organization_id", organizationId)
    .in("client_id", clientIds)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false })
    .limit(5000);

  const now = Date.now();
  const map = new Map<string, { appointments: number; lastVisit: string | null; totalSpent: number; upcoming: number }>();
  for (const row of data ?? []) {
    const entry = map.get(row.client_id) ?? {
      appointments: 0,
      lastVisit: null,
      totalSpent: 0,
      upcoming: 0,
    };
    entry.appointments += 1;
    if (new Date(row.starts_at).getTime() <= now && row.status !== "cancelled") {
      entry.lastVisit = entry.lastVisit ?? row.starts_at;
    }
    if (row.status === "completed" || row.status === "confirmed") {
      entry.totalSpent += Number(row.price);
    }
    if (
      new Date(row.starts_at).getTime() > now &&
      (row.status === "pending" || row.status === "confirmed")
    ) {
      entry.upcoming += 1;
    }
    map.set(row.client_id, entry);
  }
  return map;
}

export async function listClients(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  options: { page: PageParams; search?: string },
): Promise<{ items: ClientWithStats[]; total: number }> {
  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  const search = options.search?.trim();
  if (search) {
    const term = `%${search.replace(/[%_]/g, "")}%`;
    query = query.or(
      `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},document.ilike.${term}`,
    );
  }

  const { data, count, error } = await query
    .order("full_name", { ascending: true })
    .range(options.page.from, options.page.to);

  if (error) throw error;
  const rows = data ?? [];
  const stats = await statsFor(
    supabase,
    organizationId,
    rows.map((row) => row.id),
  );

  return {
    items: rows.map((row) => ({
      ...row,
      ...(stats.get(row.id) ?? {
        appointments: 0,
        lastVisit: null,
        totalSpent: 0,
        upcoming: 0,
      }),
    })),
    total: count ?? 0,
  };
}

export async function getClientById(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  clientId: string,
): Promise<{
  client: ClientRow;
  appointments: ClientAppointment[];
  stats: { appointments: number; lastVisit: string | null; totalSpent: number; upcoming: number };
} | null> {
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!client) return null;

  const { data: rows } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false })
    .limit(100);

  const appointments = rows ?? [];
  const serviceIds = Array.from(new Set(appointments.map((row) => row.service_id)));
  const employeeIds = Array.from(new Set(appointments.map((row) => row.employee_id)));

  const [services, employees] = await Promise.all([
    serviceIds.length
      ? supabase
          .from("services")
          .select("*")
          .eq("organization_id", organizationId)
          .in("id", serviceIds)
      : Promise.resolve({ data: [] as ServiceRow[] }),
    employeeIds.length
      ? supabase
          .from("employees")
          .select("*")
          .eq("organization_id", organizationId)
          .in("id", employeeIds)
      : Promise.resolve({ data: [] as EmployeeRow[] }),
  ]);

  const serviceMap = new Map((services.data ?? []).map((row) => [row.id, row]));
  const employeeMap = new Map((employees.data ?? []).map((row) => [row.id, row]));
  const now = Date.now();

  return {
    client,
    appointments: appointments.map((row) => ({
      ...row,
      service: serviceMap.get(row.service_id) ?? null,
      employee: employeeMap.get(row.employee_id) ?? null,
    })),
    stats: {
      appointments: appointments.length,
      lastVisit:
        appointments.find(
          (row) =>
            new Date(row.starts_at).getTime() <= now && row.status !== "cancelled",
        )?.starts_at ?? null,
      totalSpent: appointments
        .filter((row) => row.status === "completed" || row.status === "confirmed")
        .reduce((sum, row) => sum + Number(row.price), 0),
      upcoming: appointments.filter(
        (row) =>
          new Date(row.starts_at).getTime() > now &&
          (row.status === "pending" || row.status === "confirmed"),
      ).length,
    },
  };
}

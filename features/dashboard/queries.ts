import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
import type {
  AppointmentStatus,
  Database,
  EmployeeRow,
  ServiceRow,
} from "@/types/database";
import type { DatePeriod } from "@/lib/date-range";

type MetricAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price: number;
  client_id: string;
  service_id: string;
  employee_id: string;
};

export type DashboardData = {
  period: DatePeriod;
  totals: {
    appointments: number;
    revenue: number;
    newClients: number;
    pending: number;
    completed: number;
    cancelled: number;
    attendanceRate: number;
  };
  trends: {
    appointments: number;
    revenue: number;
    newClients: number;
  };
  previous: {
    appointments: number;
    revenue: number;
    newClients: number;
  };
  daily: Array<{ date: string; label: string; appointments: number; revenue: number }>;
  statuses: Array<{ status: AppointmentStatus; count: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topEmployees: Array<{ name: string; color: string; count: number; revenue: number }>;
  upcoming: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: AppointmentStatus;
    price: number;
    clientName: string;
    serviceName: string;
    employeeName: string;
    employeeColor: string;
  }>;
  todayCount: number;
};

function trend(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function isRevenueStatus(status: AppointmentStatus) {
  return status === "confirmed" || status === "completed";
}

async function loadRange(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  start: string,
  end: string,
): Promise<MetricAppointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, price, client_id, service_id, employee_id",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true })
    .limit(5000);

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, price: Number(row.price) }));
}

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  timezone: string,
  period: DatePeriod,
): Promise<DashboardData> {
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

  const [current, previous, newClients, previousNewClients, clientCount] =
    await Promise.all([
      loadRange(supabase, organizationId, period.start, period.end),
      loadRange(
        supabase,
        organizationId,
        period.previous.start,
        period.previous.end,
      ),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .gte("created_at", period.start)
        .lt("created_at", period.end),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .gte("created_at", period.previous.start)
        .lt("created_at", period.previous.end),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("deleted_at", null),
    ]);
  void clientCount;

  const currentRevenue = current
    .filter((row) => isRevenueStatus(row.status))
    .reduce((sum, row) => sum + row.price, 0);
  const previousRevenue = previous
    .filter((row) => isRevenueStatus(row.status))
    .reduce((sum, row) => sum + row.price, 0);

  const statusCounts = new Map<AppointmentStatus, number>();
  for (const row of current) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  const dailyMap = new Map<
    string,
    { appointments: number; revenue: number }
  >();
  for (const row of current) {
    const date = formatInTimeZone(new Date(row.starts_at), timezone, "yyyy-MM-dd");
    const entry = dailyMap.get(date) ?? { appointments: 0, revenue: 0 };
    entry.appointments += 1;
    if (isRevenueStatus(row.status)) entry.revenue += row.price;
    dailyMap.set(date, entry);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      label: formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "d MMM"),
      ...value,
    }));

  const serviceIds = Array.from(new Set(current.map((row) => row.service_id)));
  const employeeIds = Array.from(new Set(current.map((row) => row.employee_id)));

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

  const serviceMap = new Map(
    ((services.data ?? []) as ServiceRow[]).map((row) => [row.id, row]),
  );
  const employeeMap = new Map(
    ((employees.data ?? []) as EmployeeRow[]).map((row) => [row.id, row]),
  );

  const serviceStats = new Map<string, { count: number; revenue: number }>();
  const employeeStats = new Map<string, { count: number; revenue: number }>();
  for (const row of current) {
    const service = serviceStats.get(row.service_id) ?? { count: 0, revenue: 0 };
    service.count += 1;
    if (isRevenueStatus(row.status)) service.revenue += row.price;
    serviceStats.set(row.service_id, service);

    const employee = employeeStats.get(row.employee_id) ?? { count: 0, revenue: 0 };
    employee.count += 1;
    if (isRevenueStatus(row.status)) employee.revenue += row.price;
    employeeStats.set(row.employee_id, employee);
  }

  const topServices = Array.from(serviceStats.entries())
    .map(([id, stat]) => ({
      name: serviceMap.get(id)?.name ?? "Servicio eliminado",
      ...stat,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topEmployees = Array.from(employeeStats.entries())
    .map(([id, stat]) => {
      const employee = employeeMap.get(id);
      return {
        name: employee?.full_name ?? "Profesional eliminado",
        color: employee?.color ?? "#0F766E",
        ...stat,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const { data: upcomingRows } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, price, client_id, service_id, employee_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("starts_at", new Date().toISOString())
    .in("status", ["pending", "confirmed"])
    .order("starts_at", { ascending: true })
    .limit(6);

  const upcomingIds = upcomingRows ?? [];
  const upcomingClientIds = Array.from(
    new Set(upcomingIds.map((row) => row.client_id)),
  );
  const upcomingServiceIds = Array.from(
    new Set(upcomingIds.map((row) => row.service_id)),
  );
  const upcomingEmployeeIds = Array.from(
    new Set(upcomingIds.map((row) => row.employee_id)),
  );

  const [upcomingClients, upcomingServices, upcomingEmployees] = await Promise.all([
    upcomingClientIds.length
      ? supabase
          .from("clients")
          .select("id, full_name")
          .eq("organization_id", organizationId)
          .in("id", upcomingClientIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    upcomingServiceIds.length
      ? supabase
          .from("services")
          .select("id, name")
          .eq("organization_id", organizationId)
          .in("id", upcomingServiceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    upcomingEmployeeIds.length
      ? supabase
          .from("employees")
          .select("id, full_name, color")
          .eq("organization_id", organizationId)
          .in("id", upcomingEmployeeIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; full_name: string; color: string }>,
        }),
  ]);

  const clientNameMap = new Map(
    (upcomingClients.data ?? []).map((row) => [row.id, row.full_name]),
  );
  const serviceNameMap = new Map(
    (upcomingServices.data ?? []).map((row) => [row.id, row.name]),
  );
  const employeeNameMap = new Map(
    (upcomingEmployees.data ?? []).map((row) => [row.id, row]),
  );

  const todayCount = current.filter(
    (row) => formatInTimeZone(new Date(row.starts_at), timezone, "yyyy-MM-dd") === today,
  ).length;

  const cancelled = statusCounts.get("cancelled") ?? 0;
  const noShow = statusCounts.get("no_show") ?? 0;
  const completed = statusCounts.get("completed") ?? 0;
  const attendanceBase = completed + noShow + cancelled;

  return {
    period,
    totals: {
      appointments: current.length,
      revenue: currentRevenue,
      newClients: newClients.count ?? 0,
      pending: statusCounts.get("pending") ?? 0,
      completed,
      cancelled,
      attendanceRate:
        attendanceBase > 0 ? Math.round((completed / attendanceBase) * 100) : 100,
    },
    trends: {
      appointments: trend(current.length, previous.length),
      revenue: trend(currentRevenue, previousRevenue),
      newClients: trend(newClients.count ?? 0, previousNewClients.count ?? 0),
    },
    previous: {
      appointments: previous.length,
      revenue: previousRevenue,
      newClients: previousNewClients.count ?? 0,
    },
    daily,
    statuses: Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    topServices,
    topEmployees,
    upcoming: upcomingIds.map((row) => {
      const employee = employeeNameMap.get(row.employee_id);
      return {
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        price: Number(row.price),
        clientName: clientNameMap.get(row.client_id) ?? "Cliente",
        serviceName: serviceNameMap.get(row.service_id) ?? "Servicio",
        employeeName: employee?.full_name ?? "Profesional",
        employeeColor: employee?.color ?? "#0F766E",
      };
    }),
    todayCount,
  };
}

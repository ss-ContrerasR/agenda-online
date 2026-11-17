import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInTimeZone } from "date-fns-tz";
import type { DatePeriod } from "@/lib/date-range";
import type { Database } from "@/types/database";
import type { ReportRow } from "./types";

export async function getReportRows(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  timezone: string,
  period: DatePeriod,
): Promise<ReportRow[]> {
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, price, client_id, service_id, employee_id, source",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gte("starts_at", period.start)
    .lt("starts_at", period.end)
    .order("starts_at", { ascending: true })
    .limit(5000);

  if (error) throw error;
  const rows = appointments ?? [];
  if (rows.length === 0) return [];

  const clientIds = Array.from(new Set(rows.map((row) => row.client_id)));
  const serviceIds = Array.from(new Set(rows.map((row) => row.service_id)));
  const employeeIds = Array.from(new Set(rows.map((row) => row.employee_id)));

  const [clients, services, employees] = await Promise.all([
    supabase.from("clients").select("id, full_name").in("id", clientIds),
    supabase.from("services").select("id, name").in("id", serviceIds),
    supabase.from("employees").select("id, full_name").in("id", employeeIds),
  ]);

  const clientNames = new Map(
    (clients.data ?? []).map((row) => [row.id, row.full_name]),
  );
  const serviceNames = new Map(
    (services.data ?? []).map((row) => [row.id, row.name]),
  );
  const employeeNames = new Map(
    (employees.data ?? []).map((row) => [row.id, row.full_name]),
  );

  return rows.map((row) => ({
    id: row.id,
    date: formatInTimeZone(new Date(row.starts_at), timezone, "yyyy-MM-dd"),
    start: formatInTimeZone(new Date(row.starts_at), timezone, "HH:mm"),
    end: formatInTimeZone(new Date(row.ends_at), timezone, "HH:mm"),
    status: row.status,
    client: clientNames.get(row.client_id) ?? "Cliente",
    service: serviceNames.get(row.service_id) ?? "Servicio",
    employee: employeeNames.get(row.employee_id) ?? "Profesional",
    price: Number(row.price),
    source: row.source === "public" ? "Reserva pública" : "Panel",
  }));
}

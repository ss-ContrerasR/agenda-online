import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type {
  Database,
  EmployeeRow,
  OrganizationSettingsRow,
  ServiceRow,
} from "@/types/database";
import {
  calculateAvailability,
  type AvailabilitySlot,
  type EmployeeAvailability,
} from "@/lib/availability";
import { DEFAULT_SETTINGS } from "@/lib/auth";

export type AvailabilityResult = {
  service: ServiceRow;
  employees: EmployeeRow[];
  slots: AvailabilitySlot[];
  settings: OrganizationSettingsRow;
};

export type AvailabilityParams = {
  organizationId: string;
  timezone: string;
  serviceId: string;
  date: string;
  employeeId?: string | null;
  excludeAppointmentId?: string | null;
  enforceNotice?: boolean;
};

/**
 * Carga en una sola pasada todos los datos necesarios para calcular
 * disponibilidad. Debe recibir un cliente con permisos sobre la organización
 * (sesión del panel) o el cliente admin en el flujo público.
 */
export async function loadAvailability(
  supabase: SupabaseClient<Database>,
  params: AvailabilityParams,
): Promise<AvailabilityResult | null> {
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", params.serviceId)
    .eq("organization_id", params.organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (!service) return null;

  const { data: settingsRow } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", params.organizationId)
    .maybeSingle();

  const settings: OrganizationSettingsRow = {
    ...DEFAULT_SETTINGS,
    ...(settingsRow ?? {}),
    organization_id: params.organizationId,
    created_at: settingsRow?.created_at ?? new Date().toISOString(),
    updated_at: settingsRow?.updated_at ?? new Date().toISOString(),
  };

  const { data: links } = await supabase
    .from("employee_services")
    .select("employee_id")
    .eq("organization_id", params.organizationId)
    .eq("service_id", params.serviceId);

  const eligibleIds = (links ?? []).map((link) => link.employee_id);
  if (params.employeeId) {
    if (!eligibleIds.includes(params.employeeId)) return null;
  }
  if (eligibleIds.length === 0) {
    return { service, employees: [], slots: [], settings };
  }

  const employeeFilter = params.employeeId
    ? [params.employeeId]
    : eligibleIds;

  const dayStart = fromZonedTime(`${params.date}T00:00:00`, params.timezone);
  const dayEnd = addDays(dayStart, 2);

  const [
    { data: employees },
    { data: businessHours },
    { data: schedules },
    { data: breaks },
    { data: exceptions },
    { data: appointments },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("*")
      .in("id", employeeFilter)
      .eq("organization_id", params.organizationId)
      .eq("is_active", true)
      .is("deleted_at", null),
    supabase
      .from("business_hours")
      .select("*")
      .eq("organization_id", params.organizationId),
    supabase
      .from("employee_schedules")
      .select("*")
      .in("employee_id", employeeFilter)
      .eq("organization_id", params.organizationId),
    supabase
      .from("schedule_breaks")
      .select("*")
      .eq("organization_id", params.organizationId)
      .or(`employee_id.is.null,employee_id.in.(${employeeFilter.join(",")})`),
    supabase
      .from("schedule_exceptions")
      .select("*")
      .eq("organization_id", params.organizationId)
      .eq("exception_date", params.date)
      .or(`employee_id.is.null,employee_id.in.(${employeeFilter.join(",")})`),
    supabase
      .from("appointments")
      .select("id, employee_id, starts_at, ends_at")
      .eq("organization_id", params.organizationId)
      .in("employee_id", employeeFilter)
      .in("status", ["pending", "confirmed"])
      .is("deleted_at", null)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString()),
  ]);

  const activeEmployees = employees ?? [];
  if (activeEmployees.length === 0) {
    return { service, employees: [], slots: [], settings };
  }

  const employeeData: EmployeeAvailability[] = activeEmployees.map(
    (employee) => ({
      employeeId: employee.id,
      weekly: (schedules ?? [])
        .filter((row) => row.employee_id === employee.id)
        .map((row) => ({
          weekday: row.weekday,
          isWorking: row.is_working,
          startTime: row.start_time,
          endTime: row.end_time,
        })),
      breaks: (breaks ?? [])
        .filter(
          (row) =>
            row.employee_id === null || row.employee_id === employee.id,
        )
        .map((row) => ({
          weekday: row.weekday,
          startTime: row.start_time,
          endTime: row.end_time,
        })),
    }),
  );

  const slots = calculateAvailability({
    date: params.date,
    timezone: params.timezone,
    now: new Date(),
    serviceDuration: service.duration_minutes,
    serviceBufferMinutes: service.buffer_minutes,
    organizationBufferMinutes: settings.buffer_minutes,
    slotIntervalMinutes: settings.slot_interval_minutes,
    minNoticeMinutes: params.enforceNotice ? settings.min_notice_minutes : 0,
    maxAdvanceDays: settings.max_advance_days,
    businessHours: (businessHours ?? []).map((row) => ({
      weekday: row.weekday,
      isOpen: row.is_open,
      openTime: row.open_time,
      closeTime: row.close_time,
      breakStart: row.break_start,
      breakEnd: row.break_end,
    })),
    employees: employeeData,
    exceptions: (exceptions ?? []).map((row) => ({
      employeeId: row.employee_id,
      date: row.exception_date,
      isClosed: row.is_closed,
      startTime: row.start_time,
      endTime: row.end_time,
    })),
    busy: (appointments ?? [])
      .filter((row) => row.id !== params.excludeAppointmentId)
      .map((row) => ({
        employeeId: row.employee_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      })),
  });

  return { service, employees: activeEmployees, slots, settings };
}

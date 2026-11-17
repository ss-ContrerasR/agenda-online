import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BusinessHoursRow,
  Database,
  EmployeeRow,
  EmployeeScheduleRow,
  ScheduleBreakRow,
  ScheduleExceptionRow,
} from "@/types/database";

export type SchedulesData = {
  employees: EmployeeRow[];
  businessHours: BusinessHoursRow[];
  employeeSchedules: EmployeeScheduleRow[];
  breaks: ScheduleBreakRow[];
  exceptions: ScheduleExceptionRow[];
};

export async function getSchedulesData(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<SchedulesData> {
  const [employees, businessHours, employeeSchedules, breaks, exceptions] =
    await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("full_name", { ascending: true }),
      supabase
        .from("business_hours")
        .select("*")
        .eq("organization_id", organizationId)
        .order("weekday", { ascending: true }),
      supabase
        .from("employee_schedules")
        .select("*")
        .eq("organization_id", organizationId)
        .order("weekday", { ascending: true }),
      supabase
        .from("schedule_breaks")
        .select("*")
        .eq("organization_id", organizationId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("schedule_exceptions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("exception_date", { ascending: false })
        .limit(200),
    ]);

  return {
    employees: employees.data ?? [],
    businessHours: businessHours.data ?? [],
    employeeSchedules: employeeSchedules.data ?? [],
    breaks: breaks.data ?? [],
    exceptions: exceptions.data ?? [],
  };
}

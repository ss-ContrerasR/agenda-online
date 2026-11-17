import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { toLocalDateInput } from "@/lib/utils";
import { getSchedulesData } from "@/features/schedules/queries";
import { SchedulesManager } from "@/features/schedules/components/schedules-manager";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Horarios" };

export default async function SchedulesPage() {
  const session = await requirePermission("schedules:read");
  const supabase = await createSupabaseServerClient();
  const data = await getSchedulesData(
    supabase,
    session.membership.organization_id,
  );

  const canWrite = can(session.membership.role, "schedules:write");
  const today = toLocalDateInput(new Date(), session.organization.timezone);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios"
        description="Configura la atención del negocio, los horarios del equipo, descansos y fechas especiales."
      />
      <SchedulesManager
        employees={data.employees}
        businessHours={data.businessHours}
        employeeSchedules={data.employeeSchedules}
        breaks={data.breaks}
        exceptions={data.exceptions}
        today={today}
        canWrite={canWrite}
      />
    </div>
  );
}

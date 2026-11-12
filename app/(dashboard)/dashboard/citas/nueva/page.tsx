import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppointmentLookups } from "@/features/appointments/queries";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nueva cita" };

export default async function NewAppointmentPage() {
  const session = await requirePermission("appointments:write");
  const supabase = await createSupabaseServerClient();
  const lookups = await getAppointmentLookups(
    supabase,
    session.membership.organization_id,
  );

  const today = formatInTimeZone(
    new Date(),
    session.organization.timezone,
    "yyyy-MM-dd",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Agenda"
        title="Nueva cita"
        description="Agenda manualmente una cita para un cliente. La disponibilidad se valida en el servidor para evitar cruces de horario."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/citas">
              <ArrowLeft className="size-4" /> Volver a citas
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <AppointmentForm
            mode="create"
            currency={session.organization.currency}
            defaultValues={{ date: today, status: "confirmed" }}
            lookups={{
              clients: lookups.clients.map((client) => ({
                id: client.id,
                name: client.full_name,
              })),
              services: lookups.services.map((service) => ({
                id: service.id,
                name: service.name,
                durationMinutes: service.duration_minutes,
                price: Number(service.price),
                isActive: service.is_active,
              })),
              employees: lookups.employees
                .filter((employee) => employee.is_active)
                .map((employee) => ({
                  id: employee.id,
                  name: employee.full_name,
                })),
              employeeServices: lookups.employeeServices.map((link) => ({
                employeeId: link.employee_id,
                serviceId: link.service_id,
              })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

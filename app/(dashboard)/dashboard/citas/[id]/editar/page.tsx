import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getAppointmentById,
  getAppointmentLookups,
} from "@/features/appointments/queries";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Editar cita" };

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("appointments:write");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [result, lookups] = await Promise.all([
    getAppointmentById(supabase, session.membership.organization_id, id),
    getAppointmentLookups(supabase, session.membership.organization_id),
  ]);

  if (!result) notFound();
  const { appointment } = result;
  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    redirect(`/dashboard/citas/${appointment.id}`);
  }

  const timezone = session.organization.timezone;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Agenda"
        title="Editar cita"
        description={`${appointment.client?.full_name ?? "Cliente"} · ${appointment.service?.name ?? "Servicio"}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/citas/${appointment.id}`}>
              <ArrowLeft className="size-4" /> Volver al detalle
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <AppointmentForm
            mode="edit"
            currency={session.organization.currency}
            defaultValues={{
              appointmentId: appointment.id,
              clientId: appointment.client_id,
              serviceId: appointment.service_id,
              employeeId: appointment.employee_id,
              date: formatInTimeZone(appointment.starts_at, timezone, "yyyy-MM-dd"),
              time: formatInTimeZone(appointment.starts_at, timezone, "HH:mm"),
              status: appointment.status === "pending" ? "pending" : "confirmed",
              notes: appointment.notes ?? "",
              internalNotes: appointment.internal_notes ?? "",
            }}
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

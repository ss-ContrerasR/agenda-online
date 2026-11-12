import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppointmentById } from "@/features/appointments/queries";
import { AppointmentStatusActions } from "@/features/appointments/components/status-actions";
import { RescheduleForm } from "@/features/appointments/components/reschedule-form";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatCurrency,
  formatDateInTz,
  formatDateTimeInTz,
  formatTimeInTz,
  initials,
} from "@/lib/utils";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Detalle de la cita" };

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("appointments:read");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await getAppointmentById(
    supabase,
    session.membership.organization_id,
    id,
  );

  if (!result) notFound();

  const { appointment, history } = result;
  const timezone = session.organization.timezone;
  const currency = session.organization.currency;
  const role = session.membership.role;
  const canWrite =
    can(role, "appointments:write") || can(role, "appointments:write:own");
  const canDelete = role === "owner" || role === "admin";
  const open = appointment.status === "pending" || appointment.status === "confirmed";

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/reservar/${session.organization.slug}/cita/${appointment.public_token}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cita"
        title={appointment.client?.full_name ?? "Detalle de la cita"}
        description={`${appointment.service?.name ?? "Servicio"} · ${formatDateInTz(
          appointment.starts_at,
          timezone,
          "EEEE d 'de' MMMM 'de' yyyy",
        )}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/citas">
                <ArrowLeft className="size-4" /> Volver
              </Link>
            </Button>
            {open && canWrite ? (
              <Button asChild size="sm">
                <Link href={`/dashboard/citas/${appointment.id}/editar`}>
                  <Pencil className="size-4" /> Editar cita
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} />
          <span className="text-xs text-muted-foreground">
            Origen: {appointment.source === "public" ? "Reserva pública" : "Panel"}
          </span>
          {appointment.status === "cancelled" && appointment.cancellation_reason ? (
            <span className="text-xs text-destructive">
              Motivo: {appointment.cancellation_reason}
            </span>
          ) : null}
        </div>
        {canWrite ? (
          <AppointmentStatusActions
            appointmentId={appointment.id}
            status={appointment.status}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información de la cita</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Servicio
                </p>
                <p className="mt-1 text-sm font-medium">
                  {appointment.service?.name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointment.duration_minutes} minutos ·{" "}
                  {formatCurrency(Number(appointment.price), currency)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Profesional
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: appointment.employee?.color ?? "#0F766E" }}
                  />
                  {appointment.employee?.full_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha
                </p>
                <p className="mt-1 text-sm font-medium capitalize">
                  {formatDateInTz(appointment.starts_at, timezone, "EEEE d 'de' MMMM 'de' yyyy")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Horario
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <Clock3 className="size-3.5 text-muted-foreground" />
                  {formatTimeInTz(appointment.starts_at, timezone)} –{" "}
                  {formatTimeInTz(appointment.ends_at, timezone)}
                </p>
              </div>
              {appointment.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Observaciones
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{appointment.notes}</p>
                </div>
              ) : null}
              {appointment.internal_notes ? (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Notas internas
                  </p>
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm">
                    {appointment.internal_notes}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {open && canWrite ? (
            <Card>
              <CardHeader>
                <CardTitle>Reprogramar</CardTitle>
                <CardDescription>
                  La nueva fecha y hora se validan contra la disponibilidad real.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RescheduleForm
                  appointmentId={appointment.id}
                  defaultDate={formatInTimeZone(appointment.starts_at, timezone, "yyyy-MM-dd")}
                  defaultTime={formatInTimeZone(appointment.starts_at, timezone, "HH:mm")}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Historial de estados</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Sin cambios de estado registrados.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {history.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-card bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={entry.to_status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDateTimeInTz(entry.created_at, timezone)}
                        </span>
                      </div>
                      {entry.note ? (
                        <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(appointment.client?.full_name ?? "?")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {appointment.client?.full_name ?? "Cliente eliminado"}
                  </p>
                  {appointment.client ? (
                    <Link
                      href={`/dashboard/clientes/${appointment.client.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver ficha del cliente
                    </Link>
                  ) : null}
                </div>
              </div>
              <Separator />
              {appointment.client?.phone ? (
                <a
                  href={`tel:${appointment.client.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Phone className="size-4" /> {appointment.client.phone}
                </a>
              ) : null}
              {appointment.client?.email ? (
                <a
                  href={`mailto:${appointment.client.email}`}
                  className="flex items-center gap-2 break-all text-sm text-muted-foreground hover:text-foreground"
                >
                  <Mail className="size-4 shrink-0" /> {appointment.client.email}
                </a>
              ) : null}
              {appointment.client?.address ? (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" /> {appointment.client.address}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enlace para el cliente</CardTitle>
              <CardDescription>
                El cliente puede cancelar o reprogramar con este enlace seguro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="break-all rounded-lg bg-muted/60 p-2.5 font-mono text-[11px] text-muted-foreground">
                {publicUrl}
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/reservar/${session.organization.slug}/cita/${appointment.public_token}`} target="_blank">
                  <ExternalLink className="size-4" /> Abrir página del cliente
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" /> Creada el{" "}
                {formatDateTimeInTz(appointment.created_at, timezone)}
              </p>
              <p className="flex items-center gap-1.5">
                <UserRound className="size-3.5" /> Última actualización:{" "}
                {formatDateTimeInTz(appointment.updated_at, timezone)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

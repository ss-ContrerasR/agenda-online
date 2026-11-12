import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientById } from "@/features/clients/queries";
import { ClientForm } from "@/features/clients/components/client-form";
import { DeleteClientButton } from "@/features/clients/components/delete-client-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateInTz, formatTimeInTz, initials } from "@/lib/utils";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Ficha del cliente" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("clients:read");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const data = await getClientById(
    supabase,
    session.membership.organization_id,
    id,
  );

  if (!data) notFound();

  const { client, appointments, stats } = data;
  const timezone = session.organization.timezone;
  const currency = session.organization.currency;
  const canWrite = can(session.membership.role, "clients:write");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cliente"
        title={client.full_name}
        description={`Cliente desde ${formatDateInTz(client.created_at, timezone, "d 'de' MMMM 'de' yyyy")}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/clientes">
                <ArrowLeft className="size-4" /> Volver
              </Link>
            </Button>
            {canWrite ? <DeleteClientButton clientId={client.id} /> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Citas totales" value={stats.appointments} icon={CalendarDays} />
        <StatCard label="Próximas citas" value={stats.upcoming} icon={UserRound} hint="pendientes o confirmadas" />
        <StatCard
          label="Consumo total"
          value={formatCurrency(stats.totalSpent, currency, { compact: true })}
          icon={CircleDollarSign}
        />
        <StatCard
          label="Última visita"
          value={stats.lastVisit ? formatDateInTz(stats.lastVisit, timezone, "d MMM") : "—"}
          icon={CalendarDays}
          hint={stats.lastVisit ? formatDateInTz(stats.lastVisit, timezone, "yyyy") : "sin visitas"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3 pb-1">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials(client.full_name)}
              </span>
              <div>
                <p className="font-medium">{client.full_name}</p>
                {client.document ? (
                  <p className="text-xs text-muted-foreground">Doc. {client.document}</p>
                ) : null}
              </div>
            </div>
            <Separator />
            <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="size-4" /> {client.phone}
            </a>
            {client.email ? (
              <a href={`mailto:${client.email}`} className="flex items-center gap-2 break-all text-muted-foreground hover:text-foreground">
                <Mail className="size-4 shrink-0" /> {client.email}
              </a>
            ) : null}
            {client.address ? (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {client.address}
              </p>
            ) : null}
            {client.birth_date ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4" />
                Cumpleaños: {formatDateInTz(`${client.birth_date}T12:00:00Z`, "UTC", "d 'de' MMMM")}
              </p>
            ) : null}
            {client.notes ? (
              <>
                <Separator />
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <StickyNote className="size-3.5" /> Notas
                  </p>
                  <p className="mt-1 whitespace-pre-line">{client.notes}</p>
                </div>
              </>
            ) : null}
            {client.internal_notes ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notas internas
                </p>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/60 p-3 text-sm">
                  {client.internal_notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Historial de citas</CardTitle>
              <CardDescription>Últimas 100 citas registradas.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/citas/nueva`}>
                <CalendarDays className="size-4" /> Agendar
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin citas registradas"
                description="Agenda la primera cita de este cliente."
                className="border-0 bg-transparent py-10"
              />
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {appointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/dashboard/citas/${appointment.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/60"
                  >
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-medium capitalize">
                        {formatDateInTz(appointment.starts_at, timezone, "d MMM yy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeInTz(appointment.starts_at, timezone)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {appointment.service?.name ?? "Servicio"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.employee?.full_name ?? "Profesional"}
                      </p>
                    </div>
                    <span className="hidden text-sm sm:block">
                      {formatCurrency(Number(appointment.price), currency)}
                    </span>
                    <StatusBadge status={appointment.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Editar datos del cliente</CardTitle>
            <CardDescription>
              Los cambios se guardan de inmediato en la ficha del cliente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm mode="edit" client={client} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

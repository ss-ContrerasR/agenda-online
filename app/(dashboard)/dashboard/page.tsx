import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/date-range";
import { getDashboardData } from "@/features/dashboard/queries";
import { OverviewCharts } from "@/features/dashboard/components/overview-charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PeriodFilter } from "@/components/shared/period-filter";
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
import {
  formatCurrency,
  formatDateInTz,
  formatNumber,
  formatTimeInTz,
} from "@/lib/utils";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Resumen" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const period = resolvePeriod({
    preset: first(params.period),
    from: first(params.from),
    to: first(params.to),
    timezone: session.organization.timezone,
  });

  const supabase = await createSupabaseServerClient();
  const data = await getDashboardData(
    supabase,
    session.membership.organization_id,
    session.organization.timezone,
    period,
  );

  const currency = session.organization.currency;
  const timezone = session.organization.timezone;
  const canWrite = can(session.membership.role, "appointments:write");
  const firstName =
    session.profile?.full_name?.trim().split(/\s+/)[0] ||
    session.user.email?.split("@")[0] ||
    "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panel de control"
        title={firstName ? `Hola, ${firstName}` : "Resumen del negocio"}
        description={`Esto es lo que está pasando en ${session.organization.name} durante ${period.label.toLowerCase()}.`}
        actions={
          <>
            <PeriodFilter preset={period.preset} from={period.from} to={period.to} />
            {canWrite ? (
              <Button asChild size="sm">
                <Link href="/dashboard/citas/nueva">
                  <Plus className="size-4" /> Nueva cita
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Citas del período"
          value={formatNumber(data.totals.appointments)}
          icon={CalendarDays}
          trend={{ value: data.trends.appointments }}
          hint={`${data.todayCount} hoy`}
        />
        <StatCard
          label="Ingresos estimados"
          value={formatCurrency(data.totals.revenue, currency, { compact: true })}
          icon={CircleDollarSign}
          trend={{ value: data.trends.revenue }}
          hint={`vs. ${formatCurrency(data.previous.revenue, currency, { compact: true })}`}
        />
        <StatCard
          label="Clientes nuevos"
          value={formatNumber(data.totals.newClients)}
          icon={UserPlus}
          trend={{ value: data.trends.newClients }}
          hint="en el período"
        />
        <StatCard
          label="Asistencia"
          value={`${data.totals.attendanceRate}%`}
          icon={TrendingUp}
          hint={`${data.totals.completed} completadas · ${data.totals.pending} pendientes`}
        />
      </div>

      <OverviewCharts
        daily={data.daily}
        statuses={data.statuses}
        topServices={data.topServices}
        currency={currency}
        primary={session.settings.brand_primary}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Próximas citas</CardTitle>
              <CardDescription>Agenda confirmada y pendiente.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/citas">
                Ver agenda <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No hay próximas citas"
                description="Cuando tus clientes reserven o agendes una cita, aparecerá aquí."
                action={
                  canWrite
                    ? { label: "Agendar cita", href: "/dashboard/citas/nueva" }
                    : undefined
                }
                className="border-0 bg-transparent py-10"
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.upcoming.map((appointment) => (
                  <li key={appointment.id}>
                    <Link
                      href={`/dashboard/citas/${appointment.id}`}
                      className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <span
                        className="h-9 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: appointment.employeeColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {appointment.clientName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {appointment.serviceName} · {appointment.employeeName}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium">
                          {formatDateInTz(appointment.startsAt, timezone, "EEE d MMM")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeInTz(appointment.startsAt, timezone)}
                        </p>
                      </div>
                      <StatusBadge status={appointment.status} className="hidden md:inline-flex" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipo destacado</CardTitle>
              <CardDescription>Más citas en el período.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topEmployees.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin actividad todavía.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.topEmployees.map((employee) => (
                    <li key={employee.name} className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: employee.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {employee.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {employee.count} citas
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                { label: "Gestionar clientes", href: "/dashboard/clientes", icon: Users },
                { label: "Editar horarios", href: "/dashboard/horarios", icon: Clock3 },
                { label: "Ver reportes", href: "/dashboard/reportes", icon: TrendingUp },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-accent"
                >
                  <link.icon className="size-4 text-muted-foreground" />
                  {link.label}
                  <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

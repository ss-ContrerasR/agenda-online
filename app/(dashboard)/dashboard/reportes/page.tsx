import type { Metadata } from "next";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/date-range";
import { getDashboardData } from "@/features/dashboard/queries";
import { OverviewCharts } from "@/features/dashboard/components/overview-charts";
import { getReportRows } from "@/features/reports/queries";
import { ReportExportButton } from "@/features/reports/components/report-export";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilter } from "@/components/shared/period-filter";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("reports:read");
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
  const [data, rows] = await Promise.all([
    getDashboardData(
      supabase,
      session.membership.organization_id,
      session.organization.timezone,
      period,
    ),
    getReportRows(
      supabase,
      session.membership.organization_id,
      session.organization.timezone,
      period,
    ),
  ]);

  const currency = session.organization.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análisis"
        title="Reportes"
        description={`Rendimiento del negocio durante ${period.label.toLowerCase()} (${period.from} → ${period.to}).`}
        actions={
          <>
            <PeriodFilter preset={period.preset} from={period.from} to={period.to} />
            <ReportExportButton
              rows={rows}
              from={period.from}
              to={period.to}
              currency={currency}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Citas"
          value={formatNumber(data.totals.appointments)}
          icon={CalendarDays}
          trend={{ value: data.trends.appointments }}
          hint={`${data.previous.appointments} en el período anterior`}
        />
        <StatCard
          label="Ingresos"
          value={formatCurrency(data.totals.revenue, currency, { compact: true })}
          icon={CircleDollarSign}
          trend={{ value: data.trends.revenue }}
        />
        <StatCard
          label="Clientes nuevos"
          value={formatNumber(data.totals.newClients)}
          icon={UserPlus}
          trend={{ value: data.trends.newClients }}
        />
        <StatCard
          label="Tasa de asistencia"
          value={`${data.totals.attendanceRate}%`}
          icon={TrendingUp}
          hint={`${data.totals.completed} completadas · ${data.totals.cancelled} canceladas`}
        />
      </div>

      <OverviewCharts
        daily={data.daily}
        statuses={data.statuses}
        topServices={data.topServices}
        currency={currency}
        primary={session.settings.brand_primary}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Servicios del período</CardTitle>
            <CardDescription>Citas e ingresos por servicio.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Citas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Sin servicios en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topServices.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{service.count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(service.revenue, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipo del período</CardTitle>
            <CardDescription>Citas e ingresos por profesional.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesional</TableHead>
                  <TableHead className="text-right">Citas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Sin profesionales con actividad.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topEmployees.map((employee) => (
                    <TableRow key={employee.name}>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: employee.color }}
                          />
                          {employee.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{employee.count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(employee.revenue, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Detalle de citas</CardTitle>
            <CardDescription>
              Primeras {Math.min(50, rows.length)} de {rows.length} citas del período. El CSV incluye todas.
            </CardDescription>
          </div>
          <Badge variant="muted">
            <BarChart3 className="size-3" /> {rows.length} registros
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No hay citas en el período seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 50).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {row.date} · {row.start}
                    </TableCell>
                    <TableCell className="font-medium">{row.client}</TableCell>
                    <TableCell>{row.service}</TableCell>
                    <TableCell>{row.employee}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.price, currency)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

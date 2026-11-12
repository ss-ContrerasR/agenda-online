"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendientes",
  confirmed: "Confirmadas",
  completed: "Completadas",
  cancelled: "Canceladas",
  no_show: "No asistió",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: "#F59E0B",
  confirmed: "#10B981",
  completed: "#0EA5E9",
  cancelled: "#F43F5E",
  no_show: "#94A3B8",
};

export function OverviewCharts({
  daily,
  statuses,
  topServices,
  currency,
  primary,
}: {
  daily: Array<{ date: string; label: string; appointments: number; revenue: number }>;
  statuses: Array<{ status: AppointmentStatus; count: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  currency: string;
  primary: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Actividad del período</CardTitle>
          <CardDescription>Citas e ingresos registrados por día.</CardDescription>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Aún no hay actividad en este período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  minTickGap={20}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("es-CO", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) =>
                    name === "revenue"
                      ? [formatCurrency(Number(value), currency), "Ingresos"]
                      : [String(value), "Citas"]
                  }
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date ?? ""
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={primary}
                  strokeWidth={2}
                  fill="url(#fillRevenue)"
                  name="revenue"
                />
                <Area
                  type="monotone"
                  dataKey="appointments"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  fill="transparent"
                  strokeDasharray="4 4"
                  name="appointments"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de las citas</CardTitle>
          <CardDescription>Distribución del período.</CardDescription>
        </CardHeader>
        <CardContent>
          {statuses.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Sin citas registradas.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={statuses}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {statuses.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--popover)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [
                      `${value} citas`,
                      STATUS_LABELS[name as AppointmentStatus] ?? String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1.5">
                {statuses.map((entry) => (
                  <li
                    key={entry.status}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.status] }}
                      />
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <span className="font-medium">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Servicios más solicitados</CardTitle>
          <CardDescription>Top 5 por número de citas en el período.</CardDescription>
        </CardHeader>
        <CardContent>
          {topServices.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Sin datos para mostrar.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={topServices}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.08} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "currentColor", opacity: 0.04 }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) =>
                    name === "count"
                      ? [`${value} citas`, "Citas"]
                      : [formatCurrency(Number(value), currency), "Ingresos"]
                  }
                />
                <Bar dataKey="count" fill={primary} radius={[0, 6, 6, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateInTz, formatTimeInTz, initials } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/features/appointments/queries";

export function AppointmentsTable({
  items,
  timezone,
  currency,
  emptyAction,
}: {
  items: AppointmentWithRelations[];
  timezone: string;
  currency: string;
  emptyAction?: { label: string; href: string };
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No hay citas en este período"
        description="Cambia los filtros o agenda una nueva cita para verla aquí."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Servicio</TableHead>
            <TableHead className="hidden lg:table-cell">Profesional</TableHead>
            <TableHead className="hidden sm:table-cell">Valor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell>
                <div className="text-sm font-medium capitalize">
                  {formatDateInTz(appointment.starts_at, timezone, "EEE d MMM")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTimeInTz(appointment.starts_at, timezone)} –{" "}
                  {formatTimeInTz(appointment.ends_at, timezone)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback
                      className="text-[10px]"
                      style={{ backgroundColor: `${appointment.employee?.color ?? "#0F766E"}22` }}
                    >
                      {initials(appointment.client?.full_name ?? "?")}
                    </AvatarFallback>
                    {appointment.employee?.photo_url ? (
                      <AvatarImage
                        src={appointment.employee.photo_url}
                        alt={appointment.client?.full_name ?? ""}
                      />
                    ) : null}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {appointment.client?.full_name ?? "Cliente eliminado"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {appointment.service?.name ?? "Servicio"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="text-sm">{appointment.service?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {appointment.service?.duration_minutes ?? appointment.duration_minutes} min
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: appointment.employee?.color ?? "#0F766E" }}
                  />
                  {appointment.employee?.full_name ?? "—"}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm">
                {formatCurrency(Number(appointment.price), currency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={appointment.status} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/citas/${appointment.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Ver cita"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { addDays, addMonths, addWeeks } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency, formatTimeInTz } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/database";

export type CalendarAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  clientName: string;
  serviceName: string;
  employeeName: string;
  employeeColor: string;
  price: number;
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  confirmed: "border-primary/40 bg-primary/10 text-primary",
  completed: "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  cancelled: "border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through",
  no_show: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function toUtcDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function formatUtcDate(date: Date) {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

function weekday(date: string) {
  return toUtcDate(date).getUTCDay();
}

function startOfWeek(date: string) {
  const offset = (weekday(date) + 6) % 7;
  return formatUtcDate(addDays(toUtcDate(date), -offset));
}

function buildMonthGrid(date: string) {
  const first = `${date.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) =>
    formatUtcDate(addDays(toUtcDate(start), index)),
  );
}

export function AppointmentCalendar({
  view,
  date,
  today,
  timezone,
  currency,
  appointments,
}: {
  view: "month" | "week" | "day";
  date: string;
  today: string;
  timezone: string;
  currency: string;
  appointments: CalendarAppointment[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appointment of appointments) {
      const key = formatInTimeZone(new Date(appointment.startsAt), timezone, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [appointments, timezone]);

  function go(nextDate: string, nextView = view) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    params.set("date", nextDate);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function shift(direction: 1 | -1) {
    const base = toUtcDate(date);
    const next =
      view === "month"
        ? addMonths(base, direction)
        : view === "week"
          ? addWeeks(base, direction)
          : addDays(base, direction);
    go(formatUtcDate(next));
  }

  const days =
    view === "month"
      ? buildMonthGrid(date)
      : view === "week"
        ? Array.from({ length: 7 }, (_, index) =>
            formatUtcDate(addDays(toUtcDate(startOfWeek(date)), index)),
          )
        : [date];

  const title =
    view === "month"
      ? formatInTimeZone(toUtcDate(date), "UTC", "MMMM 'de' yyyy")
      : view === "week"
        ? `${formatInTimeZone(toUtcDate(days[0]), "UTC", "d MMM")} – ${formatInTimeZone(
            toUtcDate(days[6]),
            "UTC",
            "d MMM yyyy",
          )}`
        : formatInTimeZone(toUtcDate(date), "UTC", "EEEE d 'de' MMMM 'de' yyyy");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Siguiente">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => go(today)}>
            <CalendarDays className="size-4" />
            Hoy
          </Button>
          <h2 className="ml-1 text-sm font-semibold capitalize">{title}</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(["month", "week", "day"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => go(date, option)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === option
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "month" ? "Mes" : option === "week" ? "Semana" : "Día"}
            </button>
          ))}
        </div>
      </div>

      {view === "day" ? (
        <div className="divide-y divide-border">
          {(byDate.get(date) ?? []).length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-muted-foreground">
              No hay citas para este día.
            </p>
          ) : (
            (byDate.get(date) ?? []).map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                timezone={timezone}
                currency={currency}
              />
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>
            <div
              className={cn(
                "grid grid-cols-7",
                view === "month" ? "grid-rows-6" : "grid-rows-1",
              )}
            >
              {days.map((day) => {
                const items = byDate.get(day) ?? [];
                const inMonth = day.slice(0, 7) === date.slice(0, 7);
                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-24 border-r border-b border-border p-1.5 last:border-r-0",
                      view === "month" && !inMonth && "bg-muted/25",
                      day === today && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => go(day, "day")}
                      className={cn(
                        "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors hover:bg-accent",
                        day === today && "bg-primary text-primary-foreground hover:bg-primary/90",
                        view === "month" && !inMonth && "text-muted-foreground",
                      )}
                    >
                      {Number(day.slice(-2))}
                    </button>
                    <div className="space-y-1">
                      {items.slice(0, view === "month" ? 3 : 8).map((appointment) => (
                        <Link
                          key={appointment.id}
                          href={`/dashboard/citas/${appointment.id}`}
                          className={cn(
                            "block truncate rounded border px-1.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80",
                            STATUS_STYLES[appointment.status],
                          )}
                          title={`${formatTimeInTz(appointment.startsAt, timezone)} · ${
                            appointment.clientName
                          } · ${appointment.serviceName}`}
                        >
                          {formatTimeInTz(appointment.startsAt, timezone)}{" "}
                          {appointment.clientName}
                        </Link>
                      ))}
                      {items.length > (view === "month" ? 3 : 8) ? (
                        <button
                          type="button"
                          onClick={() => go(day, "day")}
                          className="px-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          +{items.length - (view === "month" ? 3 : 8)} más
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AppointmentRow({
  appointment,
  timezone,
  currency,
}: {
  appointment: CalendarAppointment;
  timezone: string;
  currency: string;
}) {
  return (
    <Link
      href={`/dashboard/citas/${appointment.id}`}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/60"
    >
      <div className="w-24 shrink-0">
        <p className="text-sm font-semibold">
          {formatTimeInTz(appointment.startsAt, timezone)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTimeInTz(appointment.endsAt, timezone)}
        </p>
      </div>
      <span
        className="h-9 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: appointment.employeeColor }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{appointment.clientName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {appointment.serviceName} · {appointment.employeeName}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">{formatCurrency(appointment.price, currency)}</p>
        <p className="text-xs capitalize text-muted-foreground">
          {appointment.status === "no_show"
            ? "No asistió"
            : appointment.status === "pending"
              ? "Pendiente"
              : appointment.status === "confirmed"
                ? "Confirmada"
                : appointment.status === "completed"
                  ? "Completada"
                  : "Cancelada"}
        </p>
      </div>
    </Link>
  );
}

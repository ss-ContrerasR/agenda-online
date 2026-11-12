import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Plus,
} from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysToDateString, resolvePeriod } from "@/lib/date-range";
import { pageCount, resolvePage, withParams } from "@/lib/pagination";
import { fromZonedTime } from "date-fns-tz";
import { formatInTimeZone } from "date-fns-tz";
import {
  getAppointmentsInRange,
  listAppointments,
  type AppointmentFilters,
} from "@/features/appointments/queries";
import { AppointmentsTable } from "@/features/appointments/components/appointments-table";
import {
  AppointmentCalendar,
  type CalendarAppointment,
} from "@/features/appointments/components/calendar";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { PeriodFilter } from "@/components/shared/period-filter";
import { Pagination } from "@/components/shared/pagination";
import { STATUS_OPTIONS } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppointmentStatus, MemberRole } from "@/types/database";

export const metadata: Metadata = { title: "Citas" };

type View = "list" | "month" | "week" | "day";

function startOfWeek(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDaysToDateString(date, -((weekday + 6) % 7));
}

function calendarBounds(date: string, view: Exclude<View, "list">) {
  if (view === "day") return { from: date, days: 1 };
  if (view === "week") {
    const from = startOfWeek(date);
    return { from, days: 7 };
  }
  const first = `${date.slice(0, 7)}-01`;
  const from = startOfWeek(first);
  return { from, days: 42 };
}

function rangeInstants(from: string, days: number, timezone: string) {
  return {
    start: fromZonedTime(`${from}T00:00:00`, timezone).toISOString(),
    end: fromZonedTime(`${addDaysToDateString(from, days)}T00:00:00`, timezone).toISOString(),
  };
}

function viewHref(
  base: string,
  view: View,
  date: string,
  params: Record<string, string | string[] | undefined>,
) {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    flat[key] = Array.isArray(value) ? value[0] : value;
  }
  return withParams(base, { ...flat, view, date });
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("appointments:read");
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const timezone = session.organization.timezone;
  const currency = session.organization.currency;
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const rawView = first(params.view);
  const view: View =
    rawView === "month" || rawView === "week" || rawView === "day"
      ? rawView
      : "list";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(first(params.date) ?? "")
    ? (first(params.date) as string)
    : today;

  const filters: AppointmentFilters = {
    status: STATUS_OPTIONS.some((option) => option.value === first(params.status))
      ? (first(params.status) as AppointmentStatus)
      : undefined,
    employeeId: first(params.employee),
    serviceId: first(params.service),
    search: first(params.q),
  };

  const supabase = await createSupabaseServerClient();
  const organizationId = session.membership.organization_id;

  const [{ data: employees }, { data: services }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const period = resolvePeriod({
    preset: first(params.period),
    from: first(params.from),
    to: first(params.to),
    timezone,
  });

  let tableContent: React.ReactNode = null;
  let calendarContent: React.ReactNode = null;
  let totalLabel: string | undefined;
  let page = 1;
  let pages = 1;

  if (view === "list") {
    const pageParams = resolvePage(params.page, 12);
    page = pageParams.page;
    const result = await listAppointments(supabase, organizationId, {
      page: pageParams,
      start: period.start,
      end: period.end,
      filters,
    });
    pages = pageCount(result.total, pageParams.pageSize);
    totalLabel = `${result.total} cita${result.total === 1 ? "" : "s"} en ${period.label.toLowerCase()}`;
    tableContent = (
      <AppointmentsTable
        items={result.items}
        timezone={timezone}
        currency={currency}
        emptyAction={
          session.membership.role !== "employee"
            ? { label: "Agendar cita", href: "/dashboard/citas/nueva" }
            : undefined
        }
      />
    );
  } else {
    const bounds = calendarBounds(date, view);
    const range = rangeInstants(bounds.from, bounds.days, timezone);
    const rows = await getAppointmentsInRange(
      supabase,
      organizationId,
      range.start,
      range.end,
      filters,
    );
    const calendarItems: CalendarAppointment[] = rows.map((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      clientName: row.client?.full_name ?? "Cliente",
      serviceName: row.service?.name ?? "Servicio",
      employeeName: row.employee?.full_name ?? "Profesional",
      employeeColor: row.employee?.color ?? "#0F766E",
      price: Number(row.price),
    }));
    calendarContent = (
      <AppointmentCalendar
        view={view}
        date={date}
        today={today}
        timezone={timezone}
        currency={currency}
        appointments={calendarItems}
      />
    );
  }

  const role = session.membership.role as MemberRole;
  const canCreate = role !== "employee";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Citas"
        description="Consulta, filtra y gestiona la agenda de tu negocio."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/dashboard/citas/nueva">
                <Plus className="size-4" /> Nueva cita
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput placeholder="Buscar por cliente, correo o teléfono…" />
          <FilterSelect
            param="status"
            placeholder="Estado"
            allLabel="Todos los estados"
            options={STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
          <FilterSelect
            param="employee"
            placeholder="Profesional"
            allLabel="Todo el equipo"
            options={(employees ?? []).map((employee) => ({
              value: employee.id,
              label: employee.full_name,
            }))}
          />
          <FilterSelect
            param="service"
            placeholder="Servicio"
            allLabel="Todos los servicios"
            options={(services ?? []).map((service) => ({
              value: service.id,
              label: service.name,
            }))}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          {view === "list" ? (
            <PeriodFilter preset={period.preset} from={period.from} to={period.to} />
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="icon-sm">
                <Link
                  href={viewHref(
                    "/dashboard/citas",
                    view,
                    addDaysToDateString(date, view === "month" ? -30 : view === "week" ? -7 : -1),
                    params,
                  )}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="icon-sm">
                <Link
                  href={viewHref(
                    "/dashboard/citas",
                    view,
                    addDaysToDateString(date, view === "month" ? 30 : view === "week" ? 7 : 1),
                    params,
                  )}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={viewHref("/dashboard/citas", view, today, params)}>
                  <CalendarDays className="size-4" /> Hoy
                </Link>
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Link
              href={viewHref("/dashboard/citas", "list", date, params)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList className="size-3.5" /> Lista
            </Link>
            {(["month", "week", "day"] as const).map((option) => (
              <Link
                key={option}
                href={viewHref("/dashboard/citas", option, date, params)}
                className={cn(
                  "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                  view === option
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "month" ? "Mes" : option === "week" ? "Semana" : "Día"}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {view === "list" ? (
        <>
          {tableContent}
          <Pagination
            page={page}
            pageCount={pages}
            totalLabel={totalLabel}
            createHref={(next) =>
              withParams("/dashboard/citas", {
                ...Object.fromEntries(
                  Object.entries(params).map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value[0] : value,
                  ]),
                ),
                view: "list",
                page: next,
              })
            }
          />
        </>
      ) : (
        calendarContent
      )}
    </div>
  );
}

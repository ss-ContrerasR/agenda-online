import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type PeriodPreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "last-month"
  | "custom";

export type DatePeriod = {
  preset: PeriodPreset;
  /** Fecha inicial local (yyyy-MM-dd), inclusive. */
  from: string;
  /** Fecha final local (yyyy-MM-dd), inclusive. */
  to: string;
  /** Inicio UTC inclusivo. */
  start: string;
  /** Fin UTC exclusivo. */
  end: string;
  label: string;
  days: number;
  previous: { from: string; to: string; start: string; end: string };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function addDaysToDateString(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function diffDateStrings(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function bounds(from: string, to: string, timezone: string) {
  return {
    start: fromZonedTime(`${from}T00:00:00`, timezone).toISOString(),
    end: fromZonedTime(`${addDaysToDateString(to, 1)}T00:00:00`, timezone).toISOString(),
  };
}

export function resolvePeriod(input: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  timezone: string;
  now?: Date;
}): DatePeriod {
  const now = input.now ?? new Date();
  const today = formatInTimeZone(now, input.timezone, "yyyy-MM-dd");
  const preset = (input.preset ?? "30d") as PeriodPreset;
  let from = today;
  let to = today;
  let label = "Hoy";
  let resolved: PeriodPreset = preset;

  switch (preset) {
    case "today":
      break;
    case "7d":
      from = addDaysToDateString(today, -6);
      label = "Últimos 7 días";
      break;
    case "month":
      from = startOfMonth(today);
      label = "Este mes";
      break;
    case "last-month": {
      const thisMonth = startOfMonth(today);
      to = addDaysToDateString(thisMonth, -1);
      from = startOfMonth(to);
      label = "Mes anterior";
      break;
    }
    case "custom": {
      const validFrom = input.from && ISO_DATE.test(input.from) ? input.from : addDaysToDateString(today, -29);
      const validTo = input.to && ISO_DATE.test(input.to) ? input.to : today;
      from = validFrom <= validTo ? validFrom : validTo;
      to = validFrom <= validTo ? validTo : validFrom;
      label = `${from} → ${to}`;
      resolved = "custom";
      break;
    }
    case "30d":
    default:
      from = addDaysToDateString(today, -29);
      label = "Últimos 30 días";
      resolved = "30d";
      break;
  }

  const days = diffDateStrings(from, to);
  const previousTo = addDaysToDateString(from, -1);
  const previousFrom = addDaysToDateString(previousTo, -(days - 1));

  return {
    preset: resolved,
    from,
    to,
    ...bounds(from, to, input.timezone),
    label,
    days,
    previous: {
      from: previousFrom,
      to: previousTo,
      ...bounds(previousFrom, previousTo, input.timezone),
    },
  };
}

export const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "month", label: "Este mes" },
  { value: "last-month", label: "Mes anterior" },
  { value: "custom", label: "Rango personalizado" },
];

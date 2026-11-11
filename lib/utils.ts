import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currency = "COP",
  options: { compact?: boolean } = {},
) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
    notation: options.compact ? "compact" : "standard",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function formatPercent(value: number, digits = 0) {
  return `${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: digits,
  }).format(value)}%`;
}

export function formatDateInTz(
  value: Date | string,
  timezone: string,
  pattern = "d MMM yyyy",
) {
  return formatInTimeZone(new Date(value), timezone, pattern, { locale: es });
}

export function formatTimeInTz(value: Date | string, timezone: string) {
  return formatInTimeZone(new Date(value), timezone, "h:mm a", { locale: es });
}

export function formatDateTimeInTz(value: Date | string, timezone: string) {
  return formatInTimeZone(
    new Date(value),
    timezone,
    "d MMM yyyy · h:mm a",
    { locale: es },
  );
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function getInitialsColor(name: string) {
  const palette = [
    "#0F766E",
    "#0EA5E9",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
    "#10B981",
    "#F97316",
    "#6366F1",
  ];
  const sum = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
}

/** Devuelve #ffffff o #0b1220 según el contraste del color de fondo. */
export function readableForeground(hex: string) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0b1220" : "#ffffff";
}

export function buildThemeStyle(primary: string, secondary: string, accent: string) {
  return {
    "--primary": primary,
    "--primary-foreground": readableForeground(primary),
    "--ring": primary,
    "--brand-secondary": secondary,
    "--brand-accent": accent,
  } as React.CSSProperties;
}

export function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function truncate(value: string, length = 80) {
  return value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ocurrió un error inesperado.";
}

export function toLocalDateInput(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function relativeTime(value: Date | string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return "ahora";
}

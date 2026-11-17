import type {
  BillingStatus,
  MembershipStatus,
  ProfileRow,
} from "@/types/database";

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  active: "Activa",
  trialing: "Prueba",
  past_due: "Morosa",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  trialing: "Prueba",
  past_due: "Moroso",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

export const BILLING_STATUS_OPTIONS = (
  Object.keys(BILLING_STATUS_LABELS) as BillingStatus[]
).map((value) => ({ value, label: BILLING_STATUS_LABELS[value] }));

export const MEMBERSHIP_STATUS_OPTIONS = (
  Object.keys(MEMBERSHIP_STATUS_LABELS) as MembershipStatus[]
).map((value) => ({ value, label: MEMBERSHIP_STATUS_LABELS[value] }));

export function billingVariant(
  status: BillingStatus,
): "success" | "info" | "warning" | "destructive" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "info";
    case "past_due":
      return "warning";
    case "suspended":
    case "cancelled":
      return "destructive";
  }
}

export function membershipVariant(
  status: MembershipStatus,
): "success" | "info" | "warning" | "destructive" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "info";
    case "past_due":
      return "warning";
    case "suspended":
    case "cancelled":
      return "destructive";
  }
}

type SuspendableProfile = Pick<
  ProfileRow,
  "is_suspended" | "suspended_until" | "membership_status"
>;

export type AccessState = "active" | "past_due" | "suspended" | "expired";

/** Espejo de lib/auth.ts::isProfileSuspended (mismo criterio efectivo). */
export function isUserBlocked(profile: SuspendableProfile, now = Date.now()) {
  const until = profile.suspended_until
    ? new Date(profile.suspended_until).getTime()
    : null;
  const activeSuspension =
    (profile.is_suspended || until !== null) &&
    (until === null || until > now);
  return (
    activeSuspension ||
    profile.membership_status === "suspended" ||
    profile.membership_status === "cancelled"
  );
}

/**
 * `is_suspended` puede quedar en true después de vencer una suspensión
 * temporal: en ese caso el usuario vuelve a tener acceso y debemos mostrar
 * "Suspensión vencida" en lugar de "Suspendido".
 */
export function getAccessState(
  profile: SuspendableProfile,
  now = Date.now(),
): AccessState {
  if (isUserBlocked(profile, now)) return "suspended";
  const until = profile.suspended_until
    ? new Date(profile.suspended_until).getTime()
    : null;
  if (profile.is_suspended && until !== null && until <= now) return "expired";
  if (profile.membership_status === "past_due") return "past_due";
  return "active";
}

export const ACCESS_STATE_LABELS: Record<AccessState, string> = {
  active: "Puede usar la app",
  past_due: "Acceso con morosidad",
  suspended: "Sin acceso",
  expired: "Suspensión vencida",
};

export function formatPlatformDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export const TIMEZONE_OPTIONS = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
  "Europe/Madrid",
  "UTC",
];

export const CURRENCY_OPTIONS = ["COP", "USD", "EUR", "MXN", "ARS", "CLP", "PEN"];

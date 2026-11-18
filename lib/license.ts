import type { LicensePlan, OrganizationRow } from "@/types/database";

export const TRIAL_DAYS = 7;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const LICENSE_PLAN_LABELS: Record<LicensePlan, string> = {
  trial: "Prueba de 7 días",
  monthly: "Mensual",
  bimonthly: "2 meses",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizado",
};

export const LICENSE_PLAN_OPTIONS = (
  Object.keys(LICENSE_PLAN_LABELS) as LicensePlan[]
).map((value) => ({ value, label: LICENSE_PLAN_LABELS[value] }));

export type LicenseState =
  | "trial"
  | "active"
  | "expiring"
  | "expired"
  | "suspended";

type LicenseOrg = Pick<
  OrganizationRow,
  | "is_active"
  | "billing_status"
  | "license_start_at"
  | "license_expires_at"
  | "license_plan"
  | "current_period_end"
  | "created_at"
>;

/** Compatibilidad con organizaciones creadas antes de la migración de licencias. */
export function getLicenseExpiresAt(organization: LicenseOrg): string | null {
  return organization.license_expires_at ?? organization.current_period_end ?? null;
}

export function getLicenseStartsAt(organization: LicenseOrg): string {
  return organization.license_start_at ?? organization.created_at;
}

export function getLicensePlan(organization: LicenseOrg): LicensePlan {
  return (
    organization.license_plan ??
    (organization.billing_status === "trialing" ? "trial" : "custom")
  );
}

export function isOrganizationSuspended(
  organization: Pick<OrganizationRow, "is_active" | "billing_status">,
) {
  return (
    !organization.is_active ||
    organization.billing_status === "suspended" ||
    organization.billing_status === "cancelled"
  );
}

export function daysUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - now) / MS_PER_DAY);
}

export function getLicenseState(organization: LicenseOrg, now = Date.now()): LicenseState {
  if (isOrganizationSuspended(organization)) return "suspended";

  const days = daysUntil(getLicenseExpiresAt(organization), now);
  if (days !== null && days < 0) return "expired";

  const plan = getLicensePlan(organization);
  if (plan === "trial" || organization.billing_status === "trialing") {
    return "trial";
  }
  if (days !== null && days <= 7) return "expiring";
  return "active";
}

export function licenseStateLabel(state: LicenseState, days: number | null) {
  switch (state) {
    case "trial":
      return days !== null && days >= 0
        ? `Prueba · ${days} día${days === 1 ? "" : "s"} restante${days === 1 ? "" : "s"}`
        : "Prueba finalizada";
    case "expiring":
      return days !== null
        ? `Vence en ${days} día${days === 1 ? "" : "s"}`
        : "Próxima a vencer";
    case "expired":
      return "Licencia vencida";
    case "suspended":
      return "Suspendida";
    case "active":
      return "Licencia activa";
  }
}

export function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function addMonthsIso(startIso: string, months: number): string {
  const date = new Date(startIso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString();
}

/** Fecha de finalización del trial de 7 días contada desde `start`. */
export function trialEndIso(start = new Date()): string {
  return new Date(start.getTime() + TRIAL_DAYS * MS_PER_DAY).toISOString();
}

export function trialLicenseFields(now = new Date()) {
  const endsAt = trialEndIso(now);
  return {
    billing_status: "trialing" as const,
    current_period_end: endsAt,
    license_start_at: now.toISOString(),
    license_expires_at: endsAt,
    license_plan: "trial" as const,
  };
}

export function legacyTrialLicenseFields(now = new Date()) {
  return {
    billing_status: "trialing" as const,
    current_period_end: trialEndIso(now),
  };
}

export function isMissingLicenseColumns(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("license_") ||
    message.includes("42703") ||
    /does not exist|no existe/i.test(message)
  );
}

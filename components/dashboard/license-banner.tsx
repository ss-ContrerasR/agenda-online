"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Info } from "lucide-react";
import { PaymentContactLink } from "@/components/shared/payment-contact-link";
import { InfoHint } from "@/components/shared/info-hint";
import {
  daysUntil,
  getLicenseExpiresAt,
  getLicenseState,
  type LicenseState,
} from "@/lib/license";
import { cn } from "@/lib/utils";
import type { OrganizationRow } from "@/types/database";

type BannerOrg = Pick<
  OrganizationRow,
  | "name"
  | "is_active"
  | "billing_status"
  | "license_start_at"
  | "license_expires_at"
  | "license_plan"
  | "current_period_end"
  | "created_at"
>;

function formatDate(iso: string | null) {
  if (!iso) return "por definir";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "por definir";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    dateStyle: "long",
  }).format(date);
}

const STYLES: Record<
  Exclude<LicenseState, "active">,
  { wrapper: string; icon: string }
> = {
  trial: {
    wrapper: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-300",
  },
  expiring: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-300",
  },
  expired: {
    wrapper: "border-destructive/30 bg-destructive/8 text-destructive",
    icon: "text-destructive",
  },
  suspended: {
    wrapper: "border-destructive/30 bg-destructive/8 text-destructive",
    icon: "text-destructive",
  },
};

export function LicenseBanner({
  organization,
  now,
}: {
  organization: BannerOrg;
  now: number;
}) {
  const [currentNow, setCurrentNow] = useState(now);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentNow(Date.now()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const state = getLicenseState(organization, currentNow);
  if (state === "active") return null;

  const expiresAt = getLicenseExpiresAt(organization);
  const days = daysUntil(expiresAt, currentNow);
  const style = STYLES[state];

  const countdown =
    days === null
      ? ""
      : days < 0
        ? `La licencia venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}.`
        : days === 0
          ? "Hoy es el último día."
          : `Quedan ${days} día${days === 1 ? "" : "s"}.`;

  const title =
    state === "trial"
      ? "Estás usando la prueba gratuita de 7 días"
      : state === "expiring"
        ? "Tu licencia está por vencer"
        : state === "expired"
          ? "Tu licencia está vencida"
          : "Tu acceso está suspendido";

  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        style.wrapper,
      )}
    >
      <div className="flex items-start gap-3">
        {state === "trial" ? (
          <CalendarClock className={cn("mt-0.5 size-5 shrink-0", style.icon)} />
        ) : (
          <AlertTriangle className={cn("mt-0.5 size-5 shrink-0", style.icon)} />
        )}
        <div className="text-sm">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold">
            {title}
            <InfoHint
              content="Puedes seguir usando todas las funciones del panel. El aviso desaparece o cambia cuando se registra el pago desde la consola de plataforma."
              label="Información sobre tu licencia"
            />
          </p>
          <p className="mt-0.5 text-xs leading-relaxed opacity-90">
            {countdown} Fecha de pago o renovación: {formatDate(expiresAt)}.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="hidden items-center gap-1 text-xs opacity-80 md:inline-flex">
          <Info className="size-3.5" />
          Escríbenos para ampliar o renovar tu licencia
        </span>
        <PaymentContactLink
          organizationName={organization.name}
          variant={state === "expired" || state === "suspended" ? "default" : "outline"}
          label="Realizar pago"
        />
      </div>
    </div>
  );
}

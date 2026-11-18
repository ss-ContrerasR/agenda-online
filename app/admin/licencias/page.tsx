import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarClock, CircleCheck, TriangleAlert, Ban } from "lucide-react";
import { requirePlatformAdminContext } from "@/lib/auth";
import { listLicenseOrganizations } from "@/features/superadmin/data";
import { LicensesTable } from "@/features/superadmin/components/licenses-table";
import { AdminSkeleton } from "@/features/superadmin/components/admin-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { InfoHint } from "@/components/shared/info-hint";
import { StatCard } from "@/components/shared/stat-card";
import { firstParam } from "@/lib/pagination";
import { getLicenseState } from "@/lib/license";
import { getCurrentTimestamp } from "@/lib/now";

export const metadata: Metadata = { title: "Licencias de clientes" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function LicensesContent({ searchParams }: Props) {
  await requirePlatformAdminContext();
  const params = await searchParams;
  const search = firstParam(params.q);
  const { items, total } = await listLicenseOrganizations(search);
  const now = await getCurrentTimestamp();

  const summary = items.reduce(
    (acc, organization) => {
      const state = getLicenseState(organization, now);
      if (state === "trial") acc.trial += 1;
      if (state === "expiring" || state === "expired") acc.attention += 1;
      if (state === "suspended") acc.suspended += 1;
      if (state === "active" || state === "trial") acc.active += 1;
      return acc;
    },
    { active: 0, trial: 0, attention: 0, suspended: 0 },
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Licencias activas o en prueba" value={summary.active} icon={CircleCheck} />
        <StatCard label="En prueba de 7 días" value={summary.trial} icon={CalendarClock} />
        <StatCard label="Por vencer o vencidas" value={summary.attention} icon={TriangleAlert} />
        <StatCard label="Suspendidas" value={summary.suspended} icon={Ban} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Buscar empresa por nombre, slug o correo…" />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <InfoHint
              content="Ordenamos por vencimiento: primero las que vencen antes. Usa 'Configurar licencia' en cada fila para cambiar fechas o plan."
              label="Información sobre la tabla de licencias"
            />
            Las fechas son en UTC.
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {total} empresa{total === 1 ? "" : "s"}
        </p>
      </div>

      <LicensesTable items={items} now={now} />
    </>
  );
}

export default function LicensesPage({ searchParams }: Props) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plataforma · Ventas"
        title="Licencias"
        description="Controla cuándo inicia y vence cada licencia, el plan contratado y el acceso de cada cliente."
      />
      <Suspense fallback={<AdminSkeleton rows={8} />}>
        <LicensesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

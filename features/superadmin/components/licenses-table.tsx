import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoHint } from "@/components/shared/info-hint";
import { LicenseRowActions } from "./license-actions";
import { formatPlatformDate } from "../constants";
import {
  daysUntil,
  getLicenseExpiresAt,
  getLicensePlan,
  getLicenseStartsAt,
  getLicenseState,
  LICENSE_PLAN_LABELS,
  licenseStateLabel,
  type LicenseState,
} from "@/lib/license";
import type { OrganizationRow } from "@/types/database";

const STATE_VARIANT: Record<
  LicenseState,
  "success" | "info" | "warning" | "destructive" | "muted"
> = {
  trial: "info",
  active: "success",
  expiring: "warning",
  expired: "destructive",
  suspended: "destructive",
};

export function LicensesTable({
  items,
  now,
}: {
  items: OrganizationRow[];
  now: number;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No hay empresas que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Empresa
                <InfoHint content="Nombre del negocio cliente y su identificador público." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Plan
                <InfoHint content="Mensual, 2 meses, semestral, anual, personalizado o prueba." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Inicio
                <InfoHint content="Fecha desde la que se considera activa la licencia." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Vencimiento
                <InfoHint content="Fecha de corte que ve el cliente como fecha de pago." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Estado
                <InfoHint content="Cuenta regresiva de días y si el acceso está suspendido." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Sitio
                <InfoHint content="Abre el sitio público de reservas de la empresa." />
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1.5">
                Acciones
                <InfoHint content="Configura fechas y plan, o suspende/reactiva el sistema completo." />
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((organization) => {
            const state = getLicenseState(organization, now);
            const days = daysUntil(getLicenseExpiresAt(organization), now);
            return (
              <TableRow key={organization.id}>
                <TableCell>
                  <Link
                    href={`/admin/empresas/${organization.id}`}
                    className="font-medium hover:underline"
                  >
                    {organization.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">/{organization.slug}</p>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {LICENSE_PLAN_LABELS[getLicensePlan(organization)]}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatPlatformDate(getLicenseStartsAt(organization))}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {formatPlatformDate(getLicenseExpiresAt(organization))}
                </TableCell>
                <TableCell>
                  <Badge variant={STATE_VARIANT[state]}>
                    {licenseStateLabel(state, days)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/reservar/${organization.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    aria-label={`Abrir sitio público de ${organization.name}`}
                  >
                    Abrir
                    <ExternalLink className="size-3.5" />
                  </Link>
                </TableCell>
                <TableCell>
                  <LicenseRowActions organization={organization} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

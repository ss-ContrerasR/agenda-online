import Link from "next/link";
import { ExternalLink, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoHint } from "@/components/shared/info-hint";
import { ActiveBadge, BillingBadge } from "./platform-badges";
import { formatPlatformDate } from "../constants";
import { daysUntil, getLicenseExpiresAt } from "@/lib/license";
import type { OrganizationListItem } from "../data";

export function OrganizationsTable({
  items,
  now,
}: {
  items: OrganizationListItem[];
  now: number;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No hay empresas que coincidan con los filtros.
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
                <InfoHint content="Negocio cliente y su identificador público." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Facturación
                <InfoHint content="Estado de cobro de la organización." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Estado
                <InfoHint content="Indica si el sitio y el sistema están activos o suspendidos." />
              </span>
            </TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5">
                Vence
                <InfoHint content="Fecha de corte de la licencia contratada." />
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1.5">
                Miembros
                <InfoHint content="Usuarios con acceso a esta organización." />
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1.5">
                Citas
                <InfoHint content="Reservas registradas sin contar las eliminadas." />
              </span>
            </TableHead>
            <TableHead>Creada</TableHead>
            <TableHead className="text-right">Sitio público</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((organization) => {
            const expiresAt = getLicenseExpiresAt(organization);
            const days = daysUntil(expiresAt, now);
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
                  <BillingBadge status={organization.billing_status} />
                </TableCell>
                <TableCell>
                  <ActiveBadge active={organization.is_active} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {expiresAt ? (
                    <span className="flex flex-col">
                      <span className="text-sm">{formatPlatformDate(expiresAt)}</span>
                      {days !== null ? (
                        <Badge
                          variant={
                            days < 0
                              ? "destructive"
                              : days <= 7
                                ? "warning"
                                : "muted"
                          }
                          className="mt-1 w-fit text-[10px]"
                        >
                          {days < 0
                            ? `Vencida ${Math.abs(days)}d`
                            : days === 0
                              ? "Vence hoy"
                              : `${days}d restantes`}
                        </Badge>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted-foreground" />
                    {formatNumber(organization.members)}
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatNumber(organization.appointments)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPlatformDate(organization.created_at)}
                </TableCell>
                <TableCell className="text-right">
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

import Link from "next/link";
import { ExternalLink, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActiveBadge, BillingBadge } from "./platform-badges";
import { formatPlatformDate } from "../constants";
import type { OrganizationListItem } from "../data";

export function OrganizationsTable({ items }: { items: OrganizationListItem[] }) {
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
            <TableHead>Empresa</TableHead>
            <TableHead>Facturación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Miembros</TableHead>
            <TableHead className="text-right">Citas</TableHead>
            <TableHead>Creada</TableHead>
            <TableHead className="text-right">Sitio público</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((organization) => (
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

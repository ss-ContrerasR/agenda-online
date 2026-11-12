import Link from "next/link";
import { ArrowUpRight, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDateInTz, initials } from "@/lib/utils";
import type { ClientWithStats } from "@/features/clients/queries";

export function ClientsTable({
  items,
  timezone,
  currency,
}: {
  items: ClientWithStats[];
  timezone: string;
  currency: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No hay clientes todavía"
        description="Crea tu primer cliente o recibe reservas públicas para empezar a construir tu base."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Contacto</TableHead>
            <TableHead className="text-center">Citas</TableHead>
            <TableHead className="hidden lg:table-cell">Última visita</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                      {initials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{client.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Cliente desde {formatDateInTz(client.created_at, timezone, "MMM yyyy")}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <p className="text-sm">{client.phone}</p>
                {client.email ? (
                  <p className="truncate text-xs text-muted-foreground">{client.email}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm font-medium">{client.appointments}</span>
                {client.upcoming > 0 ? (
                  <Badge variant="info" className="ml-1.5">
                    {client.upcoming} próxima{client.upcoming === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {client.lastVisit
                  ? formatDateInTz(client.lastVisit, timezone, "d MMM yyyy")
                  : "Sin visitas"}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right text-sm">
                {formatCurrency(client.totalSpent, currency)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/dashboard/clientes/${client.id}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={`Ver ficha de ${client.full_name}`}
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

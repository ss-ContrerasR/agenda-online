import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPlatformDate } from "../constants";
import type { AuditLogListItem } from "../data";

export function AuditTable({ items }: { items: AuditLogListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No hay registros de auditoría para los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatPlatformDate(item.created_at, true)}
              </TableCell>
              <TableCell>
                <Badge variant={item.action.startsWith("superadmin.") ? "info" : "secondary"}>
                  {item.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {item.entity ?? "—"}
                {item.entity_id ? (
                  <p className="max-w-44 truncate font-mono text-[11px] text-muted-foreground">
                    {item.entity_id}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-sm">{item.organizationName ?? "Plataforma"}</TableCell>
              <TableCell className="text-sm">{item.actorName ?? "Sistema"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import { AccessBadge, AdminBadge } from "./platform-badges";
import { UserActions } from "./user-actions";
import { formatPlatformDate } from "../constants";
import type { UserListItem } from "../data";

export function UsersTable({ items }: { items: UserListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No hay usuarios que coincidan con los filtros.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Empresas y roles</TableHead>
            <TableHead>Estado de acceso</TableHead>
            <TableHead>Última actividad</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((user) => (
            <TableRow key={user.id} className={cn(!user.canAccess && "bg-destructive/5")}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {initials(user.full_name || user.email || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/usuarios/${user.id}`}
                      className="block font-medium hover:underline"
                    >
                      {user.full_name || "Sin nombre"}
                    </Link>
                    <p className="max-w-52 truncate text-xs text-muted-foreground">
                      {user.email ?? "Sin correo"}
                    </p>
                    {user.isAdmin ? (
                      <span className="mt-1 inline-block">
                        <AdminBadge />
                      </span>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {user.organizations.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sin empresas</span>
                ) : (
                  <div className="flex max-w-64 flex-wrap gap-1">
                    {user.organizations.slice(0, 3).map((org) => (
                      <span
                        key={org.id}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px]"
                        title={`${org.name} · ${ROLE_LABELS[org.role]}`}
                      >
                        <span className="max-w-28 truncate">{org.name}</span>
                        <span className="text-muted-foreground">· {ROLE_LABELS[org.role]}</span>
                      </span>
                    ))}
                    {user.organizations.length > 3 ? (
                      <span className="text-[11px] text-muted-foreground">
                        +{user.organizations.length - 3}
                      </span>
                    ) : null}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <AccessBadge
                  canAccess={user.canAccess}
                  membershipStatus={user.membership_status}
                  accessState={user.accessStatus}
                />
                {user.suspended_until ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Hasta {formatPlatformDate(user.suspended_until)}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatPlatformDate(user.lastActivity)}
              </TableCell>
              <TableCell>
                <UserActions
                  userId={user.id}
                  fullName={user.full_name || user.email || "este usuario"}
                  membershipStatus={user.membership_status}
                  blocked={!user.canAccess}
                  compact
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

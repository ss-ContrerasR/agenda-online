import type { Metadata } from "next";
import { ShieldCheck, UsersRound } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { getMembersData } from "@/features/members/queries";
import {
  AddMemberDialog,
  MemberRoleSelect,
  RemoveMemberButton,
  ToggleMemberActiveButton,
} from "@/features/members/components/members-manager";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const session = await requirePermission("users:manage");
  const supabase = await createSupabaseServerClient();
  const members = await getMembersData(
    supabase,
    session.membership.organization_id,
  );

  const canManage = can(session.membership.role, "users:manage");
  const activeCount = members.filter((member) => member.is_active).length;
  const ownerCount = members.filter(
    (member) => member.is_active && member.role === "owner",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios y permisos"
        description="Administra quién tiene acceso al panel y qué puede hacer cada integrante."
        actions={canManage ? <AddMemberDialog /> : null}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Miembros" value={members.length} icon={UsersRound} />
        <StatCard label="Activos" value={activeCount} icon={ShieldCheck} />
        <StatCard
          label="Propietarios"
          value={ownerCount}
          hint="Debe conservarse al menos uno"
        />
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Todavía no hay miembros"
          description="Agrega a tus compañeros para que puedan acceder al panel."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integrante</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  {canManage ? <TableHead className="text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const name = member.profile?.full_name ?? "Usuario sin perfil";
                  const isSelf = member.user_id === session.user.id;
                  return (
                    <TableRow key={member.id} className={member.is_active ? undefined : "opacity-60"}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            {member.profile?.avatar_url ? (
                              <AvatarImage src={member.profile.avatar_url} alt={name} />
                            ) : null}
                            <AvatarFallback>{initials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {name}
                              {isSelf ? (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  (tú)
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.profile?.email ?? "Sin correo"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <MemberRoleSelect
                            membershipId={member.id}
                            role={member.role}
                            disabled={isSelf}
                          />
                        ) : (
                          <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="muted">Inactivo</Badge>
                        )}
                      </TableCell>
                      {canManage ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <ToggleMemberActiveButton
                              membershipId={member.id}
                              isActive={member.is_active}
                              name={name}
                            />
                            <RemoveMemberButton membershipId={member.id} name={name} />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

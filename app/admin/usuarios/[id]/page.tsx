import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock3, ShieldAlert } from "lucide-react";
import { requirePlatformAdminContext } from "@/lib/auth";
import { getUserById } from "@/features/superadmin/data";
import {
  ACCESS_STATE_LABELS,
  formatPlatformDate,
  getAccessState,
} from "@/features/superadmin/constants";
import {
  AccessBadge,
  AdminBadge,
  MembershipBadge,
} from "@/features/superadmin/components/platform-badges";
import { UserActions } from "@/features/superadmin/components/user-actions";
import { AdminSkeleton } from "@/features/superadmin/components/admin-skeleton";
import { ROLE_LABELS } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalle de usuario" };

type Props = { params: Promise<{ id: string }> };

async function UserDetailContent({ params }: Props) {
  await requirePlatformAdminContext();
  const { id } = await params;
  const detail = await getUserById(id);
  if (!detail) notFound();

  const { profile, organizations, isAdmin, history, audit, lastActivity } = detail;
  const accessState = getAccessState(profile);
  const blocked = accessState === "suspended";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback>{initials(profile.full_name || profile.email || "?")}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{profile.full_name || "Sin nombre"}</h2>
              {isAdmin ? <AdminBadge /> : null}
            </div>
            <p className="text-sm text-muted-foreground">{profile.email ?? "Sin correo"}</p>
            <p className="text-xs text-muted-foreground">
              Registrado el {formatPlatformDate(profile.created_at, true)}
            </p>
          </div>
        </div>
        <UserActions
          userId={profile.id}
          fullName={profile.full_name || profile.email || "este usuario"}
          membershipStatus={profile.membership_status}
          blocked={blocked}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Estado efectivo de acceso</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Puede usar la app</span>
              <AccessBadge
                canAccess={!blocked}
                accessState={accessState}
                membershipStatus={profile.membership_status}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Membresía</span>
              <MembershipBadge status={profile.membership_status} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Última actividad</span>
              <span className="text-sm">{formatPlatformDate(lastActivity, true)}</span>
            </div>
            {profile.suspended_at ? (
              <div className="rounded-lg bg-muted/50 p-3 text-xs">
                <p className="flex items-center gap-1.5 font-medium">
                  <Clock3 className="size-3.5" />
                  {ACCESS_STATE_LABELS[accessState]}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Suspendido el {formatPlatformDate(profile.suspended_at, true)}
                </p>
                {profile.suspended_until ? (
                  <p className="text-muted-foreground">
                    Fecha límite: {formatPlatformDate(profile.suspended_until, true)}
                  </p>
                ) : null}
                {profile.suspended_reason ? (
                  <p className="mt-1 text-foreground">{profile.suspended_reason}</p>
                ) : null}
              </div>
            ) : null}
            {accessState === "expired" ? (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                La suspensión temporal ya venció. El usuario puede volver a acceder
                aunque el registro conserve la marca de suspendido.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Datos del perfil</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Correo</dt>
              <dd>{profile.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{profile.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd>{formatPlatformDate(profile.created_at, true)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actualizado</dt>
              <dd>{formatPlatformDate(profile.updated_at, true)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vencimiento de membresía</dt>
              <dd>{formatPlatformDate(profile.membership_expires_at)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Superadministrador</dt>
              <dd>{isAdmin ? "Sí" : "No"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Empresas y roles ({organizations.length})</h3>
        </div>
        {organizations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Este usuario no pertenece a ninguna empresa.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Membresía</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link
                      href={`/admin/empresas/${org.id}`}
                      className="font-medium hover:underline"
                    >
                      {org.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">/{org.slug}</p>
                  </TableCell>
                  <TableCell>{ROLE_LABELS[org.role]}</TableCell>
                  <TableCell>
                    <Badge variant={org.isActive ? "success" : "muted"}>
                      {org.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Historial de suspensiones</h3>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay suspensiones registradas para este usuario.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Hasta</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatPlatformDate(entry.created_at, true)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.action === "suspended" ? "destructive" : "success"}>
                      {entry.action === "suspended" ? "Suspendido" : "Reactivado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.organizationName ?? "Plataforma"}</TableCell>
                  <TableCell className="max-w-64 text-sm">{entry.reason ?? "—"}</TableCell>
                  <TableCell>{formatPlatformDate(entry.suspended_until)}</TableCell>
                  <TableCell>{entry.actorName ?? "Plataforma"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Auditoría del usuario</h3>
        </div>
        {audit.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No hay acciones registradas para este usuario.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Entidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatPlatformDate(entry.created_at, true)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                  <TableCell>{entry.organizationName ?? "Plataforma"}</TableCell>
                  <TableCell className="text-sm">{entry.entity ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

export default function UserDetailPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/usuarios">
            <ArrowLeft className="size-4" />
            Todos los usuarios
          </Link>
        </Button>
        <PageHeader
          eyebrow="Plataforma · Usuarios"
          title="Detalle de usuario"
          description="Perfil, empresas, estado efectivo de acceso e historial de suspensiones."
        />
      </div>
      <Suspense fallback={<AdminSkeleton rows={7} />}>
        <UserDetailContent params={params} />
      </Suspense>
    </div>
  );
}

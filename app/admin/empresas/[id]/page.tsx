import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Building2, CalendarDays, ExternalLink, Users } from "lucide-react";
import { requirePlatformAdminContext } from "@/lib/auth";
import { getOrganizationById } from "@/features/superadmin/data";
import {
  AccessBadge,
  ActiveBadge,
  BillingBadge,
} from "@/features/superadmin/components/platform-badges";
import {
  OrganizationActions,
  OrganizationSuspensionNote,
} from "@/features/superadmin/components/organization-actions";
import { getAccessState, formatPlatformDate } from "@/features/superadmin/constants";
import { AdminSkeleton } from "@/features/superadmin/components/admin-skeleton";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Detalle de empresa" };

type Props = { params: Promise<{ id: string }> };

async function OrganizationDetailContent({ params }: Props) {
  await requirePlatformAdminContext();
  const { id } = await params;
  const detail = await getOrganizationById(id);
  if (!detail) notFound();

  const { organization, members, stats, history } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{organization.name}</h2>
          <p className="text-sm text-muted-foreground">/{organization.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/reservar/${organization.slug}`} target="_blank">
              <ExternalLink className="size-4" />
              Sitio público
            </Link>
          </Button>
          <OrganizationActions organization={organization} />
        </div>
      </div>

      <OrganizationSuspensionNote organization={organization} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Miembros" value={formatNumber(stats.members)} icon={Users} />
        <StatCard label="Citas" value={formatNumber(stats.appointments)} icon={CalendarDays} />
        <StatCard label="Servicios" value={formatNumber(stats.services)} icon={Building2} />
        <StatCard label="Facturación histórica" value={formatCurrency(stats.revenue, organization.currency, { compact: true })} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Datos de la empresa</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Correo</dt>
              <dd>{organization.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{organization.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ciudad</dt>
              <dd>{organization.city ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Zona horaria</dt>
              <dd>{organization.timezone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Moneda</dt>
              <dd>{organization.currency}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creada</dt>
              <dd>{formatPlatformDate(organization.created_at, true)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="flex gap-1.5 pt-0.5">
                <ActiveBadge active={organization.is_active} />
                <BillingBadge status={organization.billing_status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fin del periodo</dt>
              <dd>{formatPlatformDate(organization.current_period_end)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Accesos y seguridad</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Miembros con acceso bloqueado</span>
              <span className="font-medium">{stats.blockedMembers}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Disponibilidad pública</span>
              <ActiveBadge active={organization.is_active} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Facturación</span>
              <BillingBadge status={organization.billing_status} />
            </div>
            {organization.suspended_reason ? (
              <p className="rounded-lg bg-destructive/8 p-3 text-xs text-destructive">
                {organization.suspended_reason}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Miembros ({members.length})</h3>
        </div>
        {members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Esta empresa no tiene miembros registrados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado de acceso</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const profile = member.profile;
                const accessState = profile ? getAccessState(profile) : "suspended";
                return (
                  <TableRow key={member.membership.id}>
                    <TableCell>
                      {profile ? (
                        <Link
                          href={`/admin/usuarios/${profile.id}`}
                          className="font-medium hover:underline"
                        >
                          {profile.full_name || profile.email || "Sin nombre"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Perfil no disponible</span>
                      )}
                      {profile?.email ? (
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ROLE_LABELS[member.membership.role]}</span>
                      {!member.membership.is_active ? (
                        <span className="ml-1 text-xs text-muted-foreground">(inactivo)</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {profile ? (
                        <AccessBadge
                          canAccess={accessState !== "suspended"}
                          accessState={accessState}
                          membershipStatus={profile.membership_status}
                        />
                      ) : (
                        <Badge variant="muted">Sin perfil</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPlatformDate(member.membership.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
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
            No hay movimientos de suspensión vinculados a esta empresa.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Registrado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatPlatformDate(entry.created_at, true)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        entry.action === "suspended"
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {entry.action === "suspended" ? "Suspendido" : "Reactivado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{entry.userName ?? entry.user_id.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-64 truncate text-sm">{entry.reason ?? "—"}</TableCell>
                  <TableCell>{entry.actorName ?? "Plataforma"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

export default function OrganizationDetailPage({ params }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/empresas">
            <ArrowLeft className="size-4" />
            Todas las empresas
          </Link>
        </Button>
        <PageHeader
          eyebrow="Plataforma · Empresas"
          title="Detalle de empresa"
          description="Información, miembros y acciones de suspensión y facturación."
        />
      </div>
      <Suspense fallback={<AdminSkeleton rows={7} />}>
        <OrganizationDetailContent params={params} />
      </Suspense>
    </div>
  );
}

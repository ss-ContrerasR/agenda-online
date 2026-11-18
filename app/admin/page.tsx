import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  ScrollText,
  Users,
} from "lucide-react";
import { requirePlatformAdminContext } from "@/lib/auth";
import {
  getPlatformMetrics,
  getRecentOrganizations,
} from "@/features/superadmin/data";
import { AdminSkeleton } from "@/features/superadmin/components/admin-skeleton";
import { ActiveBadge, BillingBadge } from "@/features/superadmin/components/platform-badges";
import { formatPlatformDate } from "@/features/superadmin/constants";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen de plataforma" };

const QUICK_LINKS = [
  {
    href: "/admin/empresas",
    label: "Gestionar empresas",
    description: "Altas, suspensión y facturación",
    icon: Building2,
  },
  {
    href: "/admin/licencias",
    label: "Administrar licencias",
    description: "Planes, fechas de pago y suspensión",
    icon: ReceiptText,
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios y accesos",
    description: "Suspensiones y membresías",
    icon: Users,
  },
  {
    href: "/admin/auditoria",
    label: "Ver auditoría",
    description: "Trazabilidad de la plataforma",
    icon: ScrollText,
  },
];

async function DashboardContent() {
  await requirePlatformAdminContext();
  const [metrics, recent] = await Promise.all([
    getPlatformMetrics(),
    getRecentOrganizations(6),
  ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Empresas"
          value={formatNumber(metrics.organizations)}
          hint={`${formatNumber(metrics.activeOrganizations)} activas`}
          icon={Building2}
        />
        <StatCard
          label="Usuarios"
          value={formatNumber(metrics.users)}
          hint="Perfiles en toda la plataforma"
          icon={Users}
        />
        <StatCard
          label="Citas registradas"
          value={formatNumber(metrics.appointments)}
          hint="Historial completo"
          icon={CalendarDays}
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(metrics.monthRevenue, "COP", { compact: true })}
          hint="Confirmadas y completadas"
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold">Empresas recientes</h2>
              <Link href="/admin/empresas" className="text-sm text-primary hover:underline">
                Ver todas
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Todavía no hay empresas registradas.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Facturación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((organization) => (
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
                      <TableCell className="text-muted-foreground">
                        {formatPlatformDate(organization.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold">Estado de suspensiones</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xl font-semibold">{formatNumber(metrics.suspendedUsers)}</p>
                <p className="text-xs text-muted-foreground">Usuarios marcados como suspendidos</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xl font-semibold">{formatNumber(metrics.pastDueUsers)}</p>
                <p className="text-xs text-muted-foreground">Usuarios en morosidad o cancelados</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-2xl font-semibold">{formatNumber(metrics.inactiveOrganizations)}</p>
                <p className="text-xs text-muted-foreground">Empresas inactivas</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              Los usuarios sin acceso quedan bloqueados en todas las empresas.
            </p>
          </section>
        </div>

        <section className="space-y-3">
          <h2 className="font-semibold">Accesos rápidos</h2>
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{link.label}</span>
                  <span className="block text-xs text-muted-foreground">{link.description}</span>
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Badge variant="info">Service role</Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              Esta consola consulta todas las empresas y usuarios sin restricciones de RLS.
              Cada acción queda registrada en la auditoría global.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma"
        title="Resumen general"
        description="Métricas globales y estado operativo de todas las empresas de la plataforma."
      />
      <Suspense fallback={<AdminSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

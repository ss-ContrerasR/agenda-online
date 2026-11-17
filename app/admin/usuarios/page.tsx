import type { Metadata } from "next";
import { Suspense } from "react";
import { Info } from "lucide-react";
import { requirePlatformAdminContext } from "@/lib/auth";
import {
  listOrganizationsForFilter,
  listUsers,
} from "@/features/superadmin/data";
import { MEMBERSHIP_STATUS_OPTIONS } from "@/features/superadmin/constants";
import { UsersTable } from "@/features/superadmin/components/users-table";
import { AdminSkeleton } from "@/features/superadmin/components/admin-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import {
  firstParam,
  pageCount,
  resolvePage,
  withParams,
} from "@/lib/pagination";

export const metadata: Metadata = { title: "Usuarios y accesos" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Pueden usar la app" },
  { value: "past_due", label: "Morosos" },
  { value: "suspended", label: "Sin acceso" },
  { value: "expired", label: "Suspensión vencida" },
];

const ROLE_OPTIONS = [
  { value: "superadmin", label: "Superadministradores" },
  { value: "owner", label: "Propietarios" },
  { value: "admin", label: "Administradores" },
  { value: "receptionist", label: "Recepcionistas" },
  { value: "employee", label: "Empleados" },
];

const ACTIVITY_OPTIONS = [
  { value: "recent", label: "Activos en 7 días" },
  { value: "inactive", label: "Sin actividad en 30 días" },
  { value: "never", label: "Sin actividad registrada" },
];

async function UsersContent({ searchParams }: Props) {
  await requirePlatformAdminContext();
  const params = await searchParams;
  const pageParams = resolvePage(params.page, 15);
  const search = firstParam(params.q);
  const status = firstParam(params.status) ?? "all";
  const organizationId = firstParam(params.organization) ?? "all";
  const role = firstParam(params.role) ?? "all";
  const activity = firstParam(params.activity) ?? "all";

  const [{ items, total }, organizations] = await Promise.all([
    listUsers({
      page: pageParams,
      search,
      status,
      organizationId: organizationId === "all" ? undefined : organizationId,
      role,
      activity,
      membership: firstParam(params.membership),
    }),
    listOrganizationsForFilter(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 text-primary" />
        <p>
          El estado efectivo aplica la misma regla que el acceso real: una suspensión
          con fecha vencida ya no bloquea al usuario y se muestra como
          <strong className="font-medium text-foreground"> “Suspensión vencida”</strong>.
          Los cambios de acceso afectan a todas las empresas a la vez.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput placeholder="Buscar por nombre o correo…" />
            <FilterSelect
              param="status"
              options={STATUS_OPTIONS}
              placeholder="Estado de acceso"
              allLabel="Todos los estados"
            />
            <FilterSelect
              param="organization"
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
              placeholder="Empresa"
              allLabel="Todas las empresas"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {total} usuario{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            param="role"
            options={ROLE_OPTIONS}
            placeholder="Rol"
            allLabel="Todos los roles"
          />
          <FilterSelect
            param="activity"
            options={ACTIVITY_OPTIONS}
            placeholder="Última actividad"
            allLabel="Cualquier actividad"
          />
          <FilterSelect
            param="membership"
            options={MEMBERSHIP_STATUS_OPTIONS}
            placeholder="Membresía"
            allLabel="Cualquier membresía"
          />
        </div>
      </div>

      <UsersTable items={items} />

      <Pagination
        page={pageParams.page}
        pageCount={pageCount(total, pageParams.pageSize)}
        totalLabel={`${total} usuario${total === 1 ? "" : "s"}`}
        createHref={(next) =>
          withParams("/admin/usuarios", {
            q: search,
            status: status === "all" ? null : status,
            organization: organizationId === "all" ? null : organizationId,
            role: role === "all" ? null : role,
            activity: activity === "all" ? null : activity,
            membership: firstParam(params.membership),
            page: next,
          })
        }
      />
    </>
  );
}

export default function UsersPage({ searchParams }: Props) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plataforma"
        title="Usuarios y accesos"
        description="Todos los perfiles del sistema: miembros de cada empresa y superadministradores. suspende, reactiva o cambia la membresía de cualquiera."
      />
      <Suspense fallback={<AdminSkeleton rows={9} />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

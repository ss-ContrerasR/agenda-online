import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformAdminContext } from "@/lib/auth";
import { listOrganizations } from "@/features/superadmin/data";
import { BILLING_STATUS_OPTIONS } from "@/features/superadmin/constants";
import { CreateOrganizationDialog } from "@/features/superadmin/components/create-organization-dialog";
import { OrganizationsTable } from "@/features/superadmin/components/organizations-table";
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

export const metadata: Metadata = { title: "Empresas de la plataforma" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function CompaniesContent({ searchParams }: Props) {
  await requirePlatformAdminContext();
  const params = await searchParams;
  const pageParams = resolvePage(params.page, 15);
  const search = firstParam(params.q);
  const billing = firstParam(params.billing) ?? "all";
  const active = firstParam(params.active) ?? "all";

  const { items, total } = await listOrganizations({
    page: pageParams,
    search,
    billing,
    active,
  });

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput placeholder="Buscar por nombre, slug o correo…" />
          <FilterSelect
            param="billing"
            options={BILLING_STATUS_OPTIONS}
            placeholder="Estado de facturación"
            allLabel="Toda facturación"
          />
          <FilterSelect
            param="active"
            options={[
              { value: "active", label: "Activas" },
              { value: "inactive", label: "Inactivas" },
            ]}
            placeholder="Estado de la empresa"
            allLabel="Todos los estados"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} empresa{total === 1 ? "" : "s"} registrada{total === 1 ? "" : "s"}
        </p>
      </div>

      <OrganizationsTable items={items} />

      <Pagination
        page={pageParams.page}
        pageCount={pageCount(total, pageParams.pageSize)}
        totalLabel={`${total} empresa${total === 1 ? "" : "s"}`}
        createHref={(next) =>
          withParams("/admin/empresas", {
            q: search,
            billing: billing === "all" ? null : billing,
            active: active === "all" ? null : active,
            page: next,
          })
        }
      />
    </>
  );
}

export default function CompaniesPage({ searchParams }: Props) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plataforma"
        title="Empresas"
        description="Administra todas las organizaciones, su facturación y su disponibilidad pública."
        actions={<CreateOrganizationDialog />}
      />
      <Suspense fallback={<AdminSkeleton rows={8} />}>
        <CompaniesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

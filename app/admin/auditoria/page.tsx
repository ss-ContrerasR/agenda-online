import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePlatformAdminContext } from "@/lib/auth";
import { listAuditActions, listAuditLogs } from "@/features/superadmin/data";
import { AuditTable } from "@/features/superadmin/components/audit-table";
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

export const metadata: Metadata = { title: "Auditoría global" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function AuditContent({ searchParams }: Props) {
  await requirePlatformAdminContext();
  const params = await searchParams;
  const pageParams = resolvePage(params.page, 20);
  const action = firstParam(params.action) ?? "all";
  const search = firstParam(params.q);

  const [{ items, total }, actions] = await Promise.all([
    listAuditLogs({ page: pageParams, action, search }),
    listAuditActions(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput placeholder="Buscar por acción o entidad…" />
          <FilterSelect
            param="action"
            options={actions.map((value) => ({ value, label: value }))}
            placeholder="Acción"
            allLabel="Todas las acciones"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} registro{total === 1 ? "" : "s"}
        </p>
      </div>

      <AuditTable items={items} />

      <Pagination
        page={pageParams.page}
        pageCount={pageCount(total, pageParams.pageSize)}
        totalLabel={`${total} registro${total === 1 ? "" : "s"}`}
        createHref={(next) =>
          withParams("/admin/auditoria", {
            q: search,
            action: action === "all" ? null : action,
            page: next,
          })
        }
      />
    </>
  );
}

export default function AuditPage({ searchParams }: Props) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Plataforma"
        title="Auditoría global"
        description="Registro de todas las acciones administrativas ocurridas en la plataforma."
      />
      <Suspense fallback={<AdminSkeleton rows={10} />}>
        <AuditContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listClients } from "@/features/clients/queries";
import { ClientsTable } from "@/features/clients/components/clients-table";
import { ClientFormDialog } from "@/features/clients/components/client-form";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { resolvePage, pageCount, withParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("clients:read");
  const params = await searchParams;
  const pageParams = resolvePage(params.page, 15);
  const search = Array.isArray(params.q) ? params.q[0] : params.q;

  const supabase = await createSupabaseServerClient();
  const { items, total } = await listClients(
    supabase,
    session.membership.organization_id,
    { page: pageParams, search },
  );

  const canWrite = can(session.membership.role, "clients:write");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Centraliza los datos de contacto, historial de citas y preferencias de tus clientes."
        actions={canWrite ? <ClientFormDialog /> : null}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Buscar por nombre, teléfono, correo o documento…" />
        <p className="text-sm text-muted-foreground">
          {total} cliente{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"}
        </p>
      </div>

      <ClientsTable
        items={items}
        timezone={session.organization.timezone}
        currency={session.organization.currency}
      />

      <Pagination
        page={pageParams.page}
        pageCount={pageCount(total, pageParams.pageSize)}
        totalLabel={`${total} cliente${total === 1 ? "" : "s"}`}
        createHref={(next) =>
          withParams("/dashboard/clientes", { q: search, page: next })
        }
      />
    </div>
  );
}

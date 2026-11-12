import type { Metadata } from "next";
import { Clock3, Pencil, Sparkles, UserRound } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCatalog } from "@/features/services/queries";
import {
  DeleteServiceButton,
  ServiceFormDialog,
} from "@/features/services/components/service-form";
import {
  CategoryFormDialog,
  DeleteCategoryButton,
} from "@/features/services/components/category-form";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { can } from "@/lib/permissions";
import type { ServiceRow } from "@/types/database";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServicesPage() {
  const session = await requirePermission("services:read");
  const supabase = await createSupabaseServerClient();
  const catalog = await getCatalog(
    supabase,
    session.membership.organization_id,
  );
  const canWrite = can(session.membership.role, "services:write");

  const employeeName = new Map(
    catalog.employees.map((employee) => [employee.id, employee.full_name]),
  );
  const linksByService = new Map<string, string[]>();
  for (const link of catalog.links) {
    const list = linksByService.get(link.service_id) ?? [];
    list.push(link.employee_id);
    linksByService.set(link.service_id, list);
  }

  const groups = [
    ...catalog.categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      description: category.description,
      category,
      services: catalog.services.filter(
        (service) => service.category_id === category.id,
      ),
    })),
    {
      id: "uncategorized",
      name: "Sin categoría",
      color: "#94A3B8",
      description: null,
      category: null,
      services: catalog.services.filter((service) => !service.category_id),
    },
  ].filter((group) => group.services.length > 0 || group.category);

  const totalActive = catalog.services.filter((service) => service.is_active).length;

  function ServiceCard({ service }: { service: ServiceRow }) {
    const employeeIds = linksByService.get(service.id) ?? [];
    return (
      <Card className="group relative overflow-hidden">
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: service.color }}
        />
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{service.name}</h3>
                {!service.is_active ? (
                  <Badge variant="muted">Inactivo</Badge>
                ) : null}
              </div>
              {service.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {service.description}
                </p>
              ) : null}
            </div>
            {canWrite ? (
              <div className="flex shrink-0 items-center">
                <ServiceFormDialog
                  service={service}
                  categories={catalog.categories}
                  employees={catalog.employees}
                  selectedEmployeeIds={employeeIds}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label="Editar servicio">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <DeleteServiceButton serviceId={service.id} />
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">
              {formatCurrency(Number(service.price), session.organization.currency)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              {service.duration_minutes} min
              {service.buffer_minutes > 0 ? ` + ${service.buffer_minutes} buffer` : ""}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            {employeeIds.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Sin profesionales asignados
              </span>
            ) : (
              employeeIds.slice(0, 4).map((id) => (
                <Badge key={id} variant="outline" className="gap-1 font-normal">
                  <UserRound className="size-3" />
                  {employeeName.get(id) ?? "Profesional"}
                </Badge>
              ))
            )}
            {employeeIds.length > 4 ? (
              <Badge variant="muted">+{employeeIds.length - 4}</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios"
        description={`${catalog.services.length} servicios · ${totalActive} activos en la reserva pública`}
        actions={
          canWrite ? (
            <>
              <CategoryFormDialog />
              <ServiceFormDialog
                categories={catalog.categories}
                employees={catalog.employees}
              />
            </>
          ) : null
        }
      />

      {catalog.services.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Tu catálogo está vacío"
          description="Crea categorías y servicios para que tus clientes puedan reservar."
          action={
            canWrite
              ? undefined
              : { label: "Nuevo servicio", href: "/dashboard/servicios" }
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <h2 className="text-sm font-semibold">{group.name}</h2>
                <Badge variant="muted">{group.services.length}</Badge>
                {group.category && canWrite ? (
                  <div className="ml-auto flex items-center gap-1">
                    <CategoryFormDialog category={group.category} />
                    <DeleteCategoryButton categoryId={group.category.id} />
                  </div>
                ) : null}
              </div>
              {group.services.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Esta categoría no tiene servicios todavía.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

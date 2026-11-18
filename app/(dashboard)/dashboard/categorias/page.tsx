import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FolderTree, Layers } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryOverview } from "@/features/services/queries";
import {
  CategoryFormDialog,
  DeleteCategoryButton,
} from "@/features/services/components/category-form";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const session = await requirePermission("services:read");
  const supabase = await createSupabaseServerClient();
  const { categories, uncategorized_count } = await getCategoryOverview(
    supabase,
    session.membership.organization_id,
  );
  const canWrite = can(session.membership.role, "services:write");

  const categorizedServices = categories.reduce(
    (total, category) => total + category.service_count,
    0,
  );
  const activeServices = categories.reduce(
    (total, category) => total + category.active_service_count,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Organiza tu catálogo agrupando servicios por tipo, con su color y orden en la página pública."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/servicios">
                <ArrowLeft className="size-4" /> Servicios
              </Link>
            </Button>
            {canWrite ? <CategoryFormDialog /> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Categorías" value={categories.length} icon={FolderTree} />
        <StatCard
          label="Servicios categorizados"
          value={categorizedServices}
          hint={`${activeServices} activos en la reserva pública`}
          icon={Layers}
        />
        <StatCard
          label="Sin categoría"
          value={uncategorized_count}
          hint="Aparecen al final del catálogo"
        />
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="Aún no tienes categorías"
          description="Crea categorías para agrupar tus servicios por tipo y ordenar cómo se muestran al reservar."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="relative overflow-hidden">
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: category.color }}
              />
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <h2 className="truncate text-sm font-semibold">
                        {category.name}
                      </h2>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {category.description || "Sin descripción"}
                    </p>
                  </div>
                  {canWrite ? (
                    <div className="flex shrink-0 items-center">
                      <CategoryFormDialog category={category} />
                      <DeleteCategoryButton categoryId={category.id} />
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                  <Badge variant="muted">
                    {category.service_count}{" "}
                    {category.service_count === 1 ? "servicio" : "servicios"}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {category.active_service_count} activos
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    Orden {category.sort_order}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {uncategorized_count > 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Hay {uncategorized_count}{" "}
          {uncategorized_count === 1 ? "servicio" : "servicios"} sin categoría.{" "}
          <Link
            href="/dashboard/servicios"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Asígnalos desde Servicios
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

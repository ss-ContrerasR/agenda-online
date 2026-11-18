import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto compartido por las rutas del panel. Al existir un `loading.tsx`
 * Next muestra esta estructura al instante mientras llegan los datos de la
 * página, en lugar de dejar la pantalla anterior congelada.
 */
export function PageSkeleton({
  cards = 4,
  rows = 6,
  showHeaderAction = true,
}: {
  cards?: number;
  rows?: number;
  showHeaderAction?: boolean;
}) {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {showHeaderAction ? (
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : null}
      </div>

      {cards > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="hidden h-6 w-20 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

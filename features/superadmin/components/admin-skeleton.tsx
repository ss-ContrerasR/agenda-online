import { Skeleton } from "@/components/ui/skeleton";

export function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando datos de plataforma">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="space-y-2 rounded-xl border border-border p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 border-r border-border bg-sidebar p-4 lg:block">
        <Skeleton className="h-8 w-36" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-16 border-b border-border px-6 py-4">
          <Skeleton className="h-8 w-52" />
        </div>
        <div className="p-6">
          <AdminSkeleton />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageCount,
  createHref,
  totalLabel,
}: {
  page: number;
  pageCount: number;
  createHref: (page: number) => string;
  totalLabel?: string;
}) {
  if (pageCount <= 1) {
    return totalLabel ? (
      <p className="text-sm text-muted-foreground">{totalLabel}</p>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {totalLabel ?? `Página ${page} de ${pageCount}`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link
            href={createHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Link>
        </Button>
        <span className="px-2 text-sm font-medium">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={page >= pageCount}
        >
          <Link
            href={createHref(Math.min(pageCount, page + 1))}
            aria-disabled={page >= pageCount}
            className={
              page >= pageCount ? "pointer-events-none opacity-50" : ""
            }
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

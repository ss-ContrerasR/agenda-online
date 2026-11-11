import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-5.5" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? (
        action.href ? (
          <Button asChild className="mt-5" size="sm">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button
            className="mt-5"
            size="sm"
            type="button"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}

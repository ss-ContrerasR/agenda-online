import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  className?: string;
}) {
  const positive = (trend?.value ?? 0) >= 0;
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(trend.value)}%
          </span>
        ) : null}
        {hint ? <span className="truncate text-muted-foreground">{hint}</span> : null}
      </div>
    </Card>
  );
}

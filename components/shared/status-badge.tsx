import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<
  AppointmentStatus,
  { label: string; variant: "success" | "warning" | "info" | "destructive" | "muted" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "success" },
  completed: { label: "Completada", variant: "info" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "No asistió", variant: "muted" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const config = STATUS_MAP[status];
  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "confirmed" && "bg-emerald-500",
          status === "pending" && "bg-amber-500",
          status === "completed" && "bg-sky-500",
          status === "cancelled" && "bg-rose-500",
          status === "no_show" && "bg-slate-400",
        )}
      />
      {config.label}
    </Badge>
  );
}

export const STATUS_OPTIONS: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "no_show", label: "No asistió" },
];

export function statusLabel(status: AppointmentStatus) {
  return STATUS_MAP[status].label;
}

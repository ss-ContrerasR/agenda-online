"use client";

import { BellRing, CalendarCheck2, X } from "lucide-react";
import { relativeTime } from "@/lib/utils";

/**
 * Aviso flotante de una notificación nueva. Reemplaza el toast genérico de
 * Sonner para que la cita recién agendada destaque y se pueda abrir de un clic.
 */
export function NotificationToast({
  title,
  description,
  createdAt,
  label,
  actionLabel,
  onAction,
  onClose,
}: {
  title: string;
  description?: string | null;
  createdAt: string;
  label: string;
  actionLabel: string;
  onAction: () => void;
  onClose: () => void;
}) {
  return (
    <div className="pointer-events-auto relative w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/10">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary/70 to-primary/20" />
      <div className="flex gap-3 p-4 pl-5">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="absolute inset-0 animate-ping rounded-xl bg-primary/15" />
          <BellRing className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <CalendarCheck2 className="size-3" />
              {label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {relativeTime(createdAt)}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar notificación"
              className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <p className="mt-1 text-sm font-semibold leading-snug">{title}</p>
          {description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onAction}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {actionLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

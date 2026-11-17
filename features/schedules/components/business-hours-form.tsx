"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { saveBusinessHoursAction } from "@/features/schedules/actions";
import { WEEKDAYS } from "@/features/schedules/constants";
import { initialActionState } from "@/lib/errors";
import type { BusinessHoursRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function BusinessHoursRow({
  weekday,
  row,
  canWrite,
}: {
  weekday: (typeof WEEKDAYS)[number];
  row?: BusinessHoursRow;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveBusinessHoursAction,
    initialActionState,
  );

  useEffect(() => {
    if (!state.ok) {
      if (state.error) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Horario guardado");
    router.refresh();
  }, [state, router]);

  const day = WEEKDAYS.find((item) => item.value === weekday.value);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="text-sm font-semibold">{day?.label}</CardTitle>
        {row?.is_open ?? weekday.value !== 0 ? (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" /> Abierto
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Cerrado</span>
        )}
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="weekday" value={weekday.value} />
          <div className="flex items-center gap-2">
            <Checkbox
              id={`open-${weekday.value}`}
              name="is_open"
              defaultChecked={row?.is_open ?? weekday.value !== 0}
              disabled={!canWrite}
            />
            <Label htmlFor={`open-${weekday.value}`} className="font-normal">
              Atiende al público
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`open-time-${weekday.value}`} className="text-xs">
                Apertura
              </Label>
              <Input
                id={`open-time-${weekday.value}`}
                name="open_time"
                type="time"
                required
                disabled={!canWrite}
                defaultValue={row?.open_time ?? "09:00"}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`close-time-${weekday.value}`} className="text-xs">
                Cierre
              </Label>
              <Input
                id={`close-time-${weekday.value}`}
                name="close_time"
                type="time"
                required
                disabled={!canWrite}
                defaultValue={row?.close_time ?? "18:00"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`break-start-${weekday.value}`} className="text-xs">
                Descanso desde
              </Label>
              <Input
                id={`break-start-${weekday.value}`}
                name="break_start"
                type="time"
                disabled={!canWrite}
                defaultValue={row?.break_start ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`break-end-${weekday.value}`} className="text-xs">
                Descanso hasta
              </Label>
              <Input
                id={`break-end-${weekday.value}`}
                name="break_end"
                type="time"
                disabled={!canWrite}
                defaultValue={row?.break_end ?? ""}
              />
            </div>
          </div>

          {state.fieldErrors ? (
            <p className="text-xs text-destructive">
              {Object.values(state.fieldErrors)[0]}
            </p>
          ) : null}

          {canWrite ? (
            <Button type="submit" size="sm" className="w-full" disabled={pending}>
              {pending ? "Guardando…" : "Guardar día"}
            </Button>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function BusinessHoursForm({
  rows,
  canWrite,
}: {
  rows: BusinessHoursRow[];
  canWrite: boolean;
}) {
  const byWeekday = new Map(rows.map((row) => [row.weekday, row]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        Define cuándo atiende el negocio. Los horarios individuales de cada
        profesional nunca pueden superar estos límites.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WEEKDAYS.map((weekday) => (
          <BusinessHoursRow
            key={weekday.value}
            weekday={weekday}
            row={byWeekday.get(weekday.value)}
            canWrite={canWrite}
          />
        ))}
      </div>
    </div>
  );
}

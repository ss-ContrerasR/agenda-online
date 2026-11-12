"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rescheduleAppointmentAction } from "@/features/appointments/actions";
import { initialActionState } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RescheduleForm({
  appointmentId,
  defaultDate,
  defaultTime,
}: {
  appointmentId: string;
  defaultDate: string;
  defaultTime: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    rescheduleAppointmentAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Cita reprogramada");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reschedule-date">Nueva fecha</Label>
          <Input
            id="reschedule-date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            required
            aria-invalid={Boolean(state.fieldErrors?.date)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reschedule-time">Nueva hora</Label>
          <Input
            id="reschedule-time"
            name="time"
            type="time"
            step={300}
            defaultValue={defaultTime}
            required
            aria-invalid={Boolean(state.fieldErrors?.time)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reschedule-reason">Motivo (opcional)</Label>
        <Textarea
          id="reschedule-reason"
          name="reason"
          rows={2}
          placeholder="Ej. el cliente pidió cambiar el horario"
        />
      </div>
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarClock className="size-4" />
        )}
        Guardar nuevo horario
      </Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeAppointmentStatusAction,
  deleteAppointmentAction,
} from "@/features/appointments/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppointmentStatus } from "@/types/database";

type PendingAction = "confirm" | "complete" | "no_show" | "cancel" | "delete" | null;

export function AppointmentStatusActions({
  appointmentId,
  status,
  canWrite,
  canDelete,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");

  function run(nextStatus: AppointmentStatus, note?: string) {
    startTransition(async () => {
      const result = await changeAppointmentStatusAction({
        appointmentId,
        status: nextStatus,
        note: note ?? null,
      });
      if (result.ok) {
        toast.success(result.message ?? "Estado actualizado");
        setDialog(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error ?? "No se pudo actualizar el estado");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteAppointmentAction(appointmentId);
      if (result.ok) {
        toast.success(result.message ?? "Cita eliminada");
        router.push("/dashboard/citas");
      } else {
        toast.error(result.error ?? "No se pudo eliminar la cita");
      }
    });
  }

  const open = status === "pending" || status === "confirmed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite && status === "pending" ? (
        <Button size="sm" onClick={() => run("confirmed")} disabled={pending}>
          <Check className="size-4" />
          Confirmar
        </Button>
      ) : null}
      {canWrite && open ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("completed", "Cita completada")}
          disabled={pending}
        >
          <CheckCheck className="size-4" />
          Completar
        </Button>
      ) : null}
      {canWrite && open ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run("no_show", "Cliente no asistió")}
          disabled={pending}
        >
          <UserX className="size-4" />
          No asistió
        </Button>
      ) : null}
      {canWrite && open ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog("cancel")}
          disabled={pending}
          className="text-destructive hover:text-destructive"
        >
          <Ban className="size-4" />
          Cancelar cita
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDialog("delete")}
          disabled={pending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          Eliminar
        </Button>
      ) : null}
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}

      <AlertDialog open={dialog === "cancel"} onOpenChange={(value) => !value && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar la cita</AlertDialogTitle>
            <AlertDialogDescription>
              La cita quedará cancelada y se notificará al cliente si las notificaciones
              están activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. el cliente solicitó cancelar"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => run("cancelled", reason || "Cancelada desde el panel")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar cancelación
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={(value) => !value && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar la cita</AlertDialogTitle>
            <AlertDialogDescription>
              Se ocultará del historial operativo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Volver</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createScheduleBreakAction,
  deleteScheduleBreakAction,
} from "@/features/schedules/actions";
import { WEEKDAYS, weekdayLabel } from "@/features/schedules/constants";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { initialActionState } from "@/lib/errors";
import type { EmployeeRow, ScheduleBreakRow } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ScheduleBreakForm({
  employees,
  onSuccess,
  onCancel,
}: {
  employees: EmployeeRow[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createScheduleBreakAction,
    initialActionState,
  );
  const [employeeId, setEmployeeId] = useState("");
  const [weekday, setWeekday] = useState("1");

  useEffect(() => {
    if (!state.ok) {
      if (state.error) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Descanso agregado");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Día *</Label>
          <Select value={weekday} onValueChange={setWeekday}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((day) => (
                <SelectItem key={day.value} value={String(day.value)}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="weekday" value={weekday} />
        </div>
        <div className="space-y-1.5">
          <Label>Profesional (opcional)</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los profesionales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos los profesionales</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="hidden"
            name="employee_id"
            value={employeeId === "__all" ? "" : employeeId}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="break_start">Desde *</Label>
          <Input id="break_start" name="start_time" type="time" required defaultValue="13:00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="break_end">Hasta *</Label>
          <Input id="break_end" name="end_time" type="time" required defaultValue="14:00" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="break_label">Etiqueta</Label>
          <Input
            id="break_label"
            name="label"
            placeholder="Ej. Almuerzo"
            defaultValue="Almuerzo"
          />
        </div>
      </div>
      {state.fieldErrors ? (
        <p className="text-xs text-destructive">
          {Object.values(state.fieldErrors)[0]}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Agregar descanso"}
        </Button>
      </div>
    </form>
  );
}

export function ScheduleBreaks({
  employees,
  breaks,
  canWrite,
}: {
  employees: EmployeeRow[];
  breaks: ScheduleBreakRow[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const employeeName = new Map(employees.map((item) => [item.id, item.full_name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bloques no reservables. Se aplican a todos o a un profesional específico.
        </p>
        {canWrite ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Nuevo descanso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo descanso</DialogTitle>
                <DialogDescription>
                  Define un rango horario en el que no se tomarán reservas.
                </DialogDescription>
              </DialogHeader>
              <ScheduleBreakForm
                employees={employees}
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {breaks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <Coffee className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Sin descansos configurados</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Agrega almuerzos u otros bloques para evitar reservas en esos horarios.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Aplica a</TableHead>
                  {canWrite ? <TableHead className="text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {breaks.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{weekdayLabel(item.weekday)}</TableCell>
                    <TableCell className="tabular-nums">
                      {item.start_time} – {item.end_time}
                    </TableCell>
                    <TableCell>{item.label ?? "Descanso"}</TableCell>
                    <TableCell>
                      {item.employee_id ? (
                        <Badge variant="outline">
                          {employeeName.get(item.employee_id) ?? "Profesional"}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Todo el equipo</Badge>
                      )}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <div className="flex justify-end">
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Eliminar descanso"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                            title="Eliminar descanso"
                            description="El bloque dejará de considerarse al calcular la disponibilidad."
                            confirmLabel="Eliminar"
                            onConfirm={() => deleteScheduleBreakAction(item.id)}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

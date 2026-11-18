"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEmployeeScheduleAction,
  saveEmployeeScheduleAction,
} from "@/features/schedules/actions";
import { WEEKDAYS, weekdayLabel } from "@/features/schedules/constants";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { initialActionState } from "@/lib/errors";
import type { EmployeeRow, EmployeeScheduleRow } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

function EmployeeScheduleForm({
  schedule,
  employees,
  onSuccess,
  onCancel,
}: {
  schedule?: EmployeeScheduleRow;
  employees: EmployeeRow[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveEmployeeScheduleAction,
    initialActionState,
  );
  const [employeeId, setEmployeeId] = useState(schedule?.employee_id ?? "");
  const [weekday, setWeekday] = useState(String(schedule?.weekday ?? 1));

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Horario guardado");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Profesional *</Label>
          <Select value={employeeId} onValueChange={setEmployeeId} disabled={Boolean(schedule)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un profesional" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="employee_id" value={employeeId} />
        </div>
        <div className="space-y-1.5">
          <Label>Día *</Label>
          <Select value={weekday} onValueChange={setWeekday} disabled={Boolean(schedule)}>
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
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="is_working"
            name="is_working"
            defaultChecked={schedule?.is_working ?? true}
          />
          <Label htmlFor="is_working" className="font-normal">
            El profesional atiende este día
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start_time">Desde</Label>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            required
            defaultValue={(schedule?.start_time ?? "09:00").slice(0, 5)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_time">Hasta</Label>
          <Input
            id="end_time"
            name="end_time"
            type="time"
            required
            defaultValue={(schedule?.end_time ?? "18:00").slice(0, 5)}
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
        <Button type="submit" disabled={pending || !employeeId}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function EmployeeScheduleDialog({
  employees,
  schedule,
  trigger,
}: {
  employees: EmployeeRow[];
  schedule?: EmployeeScheduleRow;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> Asignar horario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Editar horario" : "Horario del profesional"}
          </DialogTitle>
          <DialogDescription>
            Si existe un horario para ese día y profesional, se actualizará.
          </DialogDescription>
        </DialogHeader>
        <EmployeeScheduleForm
          employees={employees}
          schedule={schedule}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EmployeeSchedules({
  employees,
  schedules,
  canWrite,
}: {
  employees: EmployeeRow[];
  schedules: EmployeeScheduleRow[];
  canWrite: boolean;
}) {
  const employeeName = new Map(employees.map((item) => [item.id, item.full_name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {schedules.length} horario{schedules.length === 1 ? "" : "s"} asignado
          {schedules.length === 1 ? "" : "s"}. Sin horario propio, se usa el del negocio.
        </p>
        {canWrite && employees.length > 0 ? (
          <EmployeeScheduleDialog employees={employees} />
        ) : null}
      </div>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <CalendarClock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Sin horarios individuales</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Asigna horarios por día a cada profesional o deja que hereden el
            horario general del negocio.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesional</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Estado</TableHead>
                  {canWrite ? <TableHead className="text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {employeeName.get(schedule.employee_id) ?? "Profesional"}
                    </TableCell>
                    <TableCell>{weekdayLabel(schedule.weekday)}</TableCell>
                    <TableCell className="tabular-nums">
                      {schedule.start_time.slice(0, 5)} – {schedule.end_time.slice(0, 5)}
                    </TableCell>
                    <TableCell>
                      {schedule.is_working ? (
                        <Badge variant="success">Trabaja</Badge>
                      ) : (
                        <Badge variant="muted">No trabaja</Badge>
                      )}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <EmployeeScheduleDialog
                            employees={employees}
                            schedule={schedule}
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label="Editar horario">
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Eliminar horario"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                            title="Eliminar horario"
                            description="El profesional volverá a usar el horario general del negocio para ese día."
                            confirmLabel="Eliminar"
                            onConfirm={() => deleteEmployeeScheduleAction(schedule.id)}
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

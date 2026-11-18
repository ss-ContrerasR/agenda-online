"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteScheduleExceptionAction,
  saveScheduleExceptionAction,
} from "@/features/schedules/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { initialActionState } from "@/lib/errors";
import type { EmployeeRow, ScheduleExceptionRow } from "@/types/database";
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
import { Textarea } from "@/components/ui/textarea";

function ScheduleExceptionForm({
  exception,
  employees,
  today,
  onSuccess,
  onCancel,
}: {
  exception?: ScheduleExceptionRow;
  employees: EmployeeRow[];
  today: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveScheduleExceptionAction,
    initialActionState,
  );
  const [isClosed, setIsClosed] = useState(exception?.is_closed ?? true);
  const [employeeId, setEmployeeId] = useState(exception?.employee_id ?? "__all");

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Excepción guardada");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {exception ? (
        <input type="hidden" name="exceptionId" value={exception.id} />
      ) : null}
      <input type="hidden" name="is_closed" value={isClosed ? "on" : "off"} />
      <input
        type="hidden"
        name="employee_id"
        value={employeeId === "__all" ? "" : employeeId}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="exception_date">Fecha *</Label>
          <Input
            id="exception_date"
            name="exception_date"
            type="date"
            required
            defaultValue={exception?.exception_date ?? today}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Aplica a</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todo el negocio</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="is_closed_exception"
            checked={isClosed}
            onCheckedChange={(value) => setIsClosed(value === true)}
          />
          <Label htmlFor="is_closed_exception" className="font-normal">
            Cerrado todo el día
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exception_start">Horario especial desde</Label>
          <Input
            id="exception_start"
            name="start_time"
            type="time"
            defaultValue={(exception?.start_time ?? "").slice(0, 5)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exception_end">Horario especial hasta</Label>
          <Input
            id="exception_end"
            name="end_time"
            type="time"
            defaultValue={(exception?.end_time ?? "").slice(0, 5)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="exception_reason">Motivo</Label>
          <Textarea
            id="exception_reason"
            name="reason"
            rows={2}
            defaultValue={exception?.reason ?? ""}
            placeholder="Ej. Día festivo, vacaciones…"
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
          {pending ? "Guardando…" : "Guardar excepción"}
        </Button>
      </div>
    </form>
  );
}

function ScheduleExceptionDialog({
  exception,
  employees,
  today,
  trigger,
}: {
  exception?: ScheduleExceptionRow;
  employees: EmployeeRow[];
  today: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> Nueva excepción
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {exception ? "Editar excepción" : "Nueva excepción"}
          </DialogTitle>
          <DialogDescription>
            Cierra un día completo o define un horario especial para una fecha.
          </DialogDescription>
        </DialogHeader>
        <ScheduleExceptionForm
          exception={exception}
          employees={employees}
          today={today}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleExceptions({
  employees,
  exceptions,
  today,
  canWrite,
}: {
  employees: EmployeeRow[];
  exceptions: ScheduleExceptionRow[];
  today: string;
  canWrite: boolean;
}) {
  const employeeName = new Map(employees.map((item) => [item.id, item.full_name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Fechas cerradas u horarios especiales que tienen prioridad sobre el horario semanal.
        </p>
        {canWrite ? (
          <ScheduleExceptionDialog employees={employees} today={today} />
        ) : null}
      </div>

      {exceptions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <CalendarOff className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Sin excepciones</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Agrega festivos, cierres o jornadas especiales para esos días.
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  {canWrite ? <TableHead className="text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell className="font-medium tabular-nums">
                      {exception.exception_date}
                    </TableCell>
                    <TableCell>
                      {exception.employee_id ? (
                        <Badge variant="outline">
                          {employeeName.get(exception.employee_id) ?? "Profesional"}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Todo el negocio</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {exception.is_closed ? (
                        <Badge variant="destructive">Cerrado</Badge>
                      ) : (
                        <Badge variant="info">
                          {exception.start_time?.slice(0, 5)} – {exception.end_time?.slice(0, 5)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                      {exception.reason ?? "—"}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <ScheduleExceptionDialog
                            exception={exception}
                            employees={employees}
                            today={today}
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label="Editar excepción">
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
                                aria-label="Eliminar excepción"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            }
                            title="Eliminar excepción"
                            description="La fecha volverá a usar el horario semanal configurado."
                            confirmLabel="Eliminar"
                            onConfirm={() => deleteScheduleExceptionAction(exception.id)}
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

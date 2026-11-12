"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createAppointmentAction,
  updateAppointmentAction,
} from "@/features/appointments/actions";
import { initialActionState } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export type AppointmentFormLookups = {
  clients: Array<{ id: string; name: string }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    isActive: boolean;
  }>;
  employees: Array<{ id: string; name: string }>;
  employeeServices: Array<{ employeeId: string; serviceId: string }>;
};

export type AppointmentFormValues = {
  appointmentId?: string;
  clientId: string;
  serviceId: string;
  employeeId: string;
  date: string;
  time: string;
  status: "pending" | "confirmed";
  notes: string;
  internalNotes: string;
};

export function AppointmentForm({
  mode,
  lookups,
  defaultValues,
  currency,
  onSuccess,
  compact = false,
}: {
  mode: "create" | "edit";
  lookups: AppointmentFormLookups;
  defaultValues?: Partial<AppointmentFormValues>;
  currency: string;
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const action = mode === "create" ? createAppointmentAction : updateAppointmentAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  const [serviceId, setServiceId] = useState(defaultValues?.serviceId ?? "");
  const [employeeId, setEmployeeId] = useState(defaultValues?.employeeId ?? "");

  const eligibleEmployees = useMemo(() => {
    if (!serviceId) return lookups.employees;
    const ids = new Set(
      lookups.employeeServices
        .filter((link) => link.serviceId === serviceId)
        .map((link) => link.employeeId),
    );
    return lookups.employees.filter((employee) => ids.has(employee.id));
  }, [lookups, serviceId]);

  const selectedService = lookups.services.find((service) => service.id === serviceId);

  useEffect(() => {
    if (employeeId && !eligibleEmployees.some((employee) => employee.id === employeeId)) {
      setEmployeeId("");
    }
  }, [eligibleEmployees, employeeId]);

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    if (mode === "create") {
      const id = (state.data as { id?: string } | undefined)?.id;
      toast.success(state.message ?? "Cita creada");
      router.push(id ? `/dashboard/citas/${id}` : "/dashboard/citas");
      return;
    }
    toast.success(state.message ?? "Cita actualizada");
    onSuccess?.();
    router.refresh();
  }, [state, mode, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" ? (
        <input type="hidden" name="appointmentId" value={defaultValues?.appointmentId ?? ""} />
      ) : null}

      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Cliente</Label>
          <Select name="clientId" defaultValue={defaultValues?.clientId} required>
            <SelectTrigger id="clientId" aria-invalid={Boolean(state.fieldErrors?.clientId)}>
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {lookups.clients.length === 0 ? (
                <SelectItem value="__none" disabled>
                  Primero crea un cliente
                </SelectItem>
              ) : null}
              {lookups.clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.clientId ? (
            <p className="text-xs text-destructive">{state.fieldErrors.clientId}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serviceId">Servicio</Label>
          <Select
            name="serviceId"
            value={serviceId}
            onValueChange={setServiceId}
            required
          >
            <SelectTrigger id="serviceId" aria-invalid={Boolean(state.fieldErrors?.serviceId)}>
              <SelectValue placeholder="Selecciona un servicio" />
            </SelectTrigger>
            <SelectContent>
              {lookups.services
                .filter((service) => service.isActive || service.id === serviceId)
                .map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} · {service.durationMinutes} min
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selectedService ? (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(selectedService.price, currency)} ·{" "}
              {selectedService.durationMinutes} minutos
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="employeeId">Profesional</Label>
          <Select
            name="employeeId"
            value={employeeId}
            onValueChange={setEmployeeId}
            required
            disabled={eligibleEmployees.length === 0}
          >
            <SelectTrigger id="employeeId" aria-invalid={Boolean(state.fieldErrors?.employeeId)}>
              <SelectValue
                placeholder={
                  eligibleEmployees.length === 0
                    ? "Sin profesionales para este servicio"
                    : "Selecciona un profesional"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {eligibleEmployees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={defaultValues?.date}
              aria-invalid={Boolean(state.fieldErrors?.date)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Hora</Label>
            <Input
              id="time"
              name="time"
              type="time"
              required
              step={300}
              defaultValue={defaultValues?.time}
              aria-invalid={Boolean(state.fieldErrors?.time)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Estado inicial</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? "confirmed"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Observaciones para el cliente</Label>
          <Input
            id="notes"
            name="notes"
            defaultValue={defaultValues?.notes}
            placeholder="Ej. llega 10 minutos antes"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="internalNotes">Notas internas</Label>
          <Textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            defaultValue={defaultValues?.internalNotes}
            placeholder="Solo visible para el equipo"
          />
        </div>
      </div>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onSuccess ? (
          <Button type="button" variant="outline" onClick={onSuccess} disabled={pending}>
            Cancelar
          </Button>
        ) : (
          <Button asChild variant="outline">
            <a href="/dashboard/citas">Volver a citas</a>
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === "create" ? (
            <CalendarClock className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
          {mode === "create" ? "Agendar cita" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

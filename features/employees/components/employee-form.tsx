"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  restoreEmployeeAction,
  updateEmployeeAction,
} from "@/features/employees/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { initialActionState } from "@/lib/errors";
import type { EmployeeRow, ServiceRow } from "@/types/database";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function EmployeeForm({
  employee,
  services,
  selectedServiceIds = [],
  onSuccess,
  onCancel,
}: {
  employee?: EmployeeRow;
  services: ServiceRow[];
  selectedServiceIds?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const action = employee ? updateEmployeeAction : createEmployeeAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [photoUrl, setPhotoUrl] = useState(employee?.photo_url ?? "");
  const [color, setColor] = useState(employee?.color ?? "#0F766E");

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Profesional guardado");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {employee ? (
        <input type="hidden" name="employeeId" value={employee.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="full_name">Nombre completo *</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={employee?.full_name}
            placeholder="Ej. María Rodríguez"
            aria-invalid={Boolean(state.fieldErrors?.full_name)}
          />
          <FieldError message={state.fieldErrors?.full_name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={employee?.email ?? ""}
            placeholder="maria@ejemplo.com"
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
          <FieldError message={state.fieldErrors?.email} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={employee?.phone ?? ""}
            placeholder="+57 300 555 0000"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="position">Cargo o posición</Label>
          <Input
            id="position"
            name="position"
            defaultValue={employee?.position ?? ""}
            placeholder="Ej. Estilista senior"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="color">Color identificador</Label>
          <Input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9.5 w-full p-1"
          />
          <FieldError message={state.fieldErrors?.color} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="photo_url">URL de la foto</Label>
          <Input
            id="photo_url"
            name="photo_url"
            type="url"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            placeholder="https://…"
          />
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Vista previa"
              className="mt-2 size-14 rounded-lg border border-border object-cover"
            />
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="specialties">Especialidades (separadas por coma)</Label>
          <Input
            id="specialties"
            name="specialties"
            defaultValue={employee?.specialties.join(", ") ?? ""}
            placeholder="Cortes, Coloración, Manicura"
          />
          <FieldError message={state.fieldErrors?.specialties} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="bio">Biografía</Label>
          <Textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={employee?.bio ?? ""}
            placeholder="Cuéntale a tus clientes sobre este profesional"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Servicios que realiza</Label>
          {services.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Crea servicios en el catálogo para poder asignarlos.
            </p>
          ) : (
            <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  htmlFor={`service-${service.id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`service-${service.id}`}
                    name="serviceIds"
                    value={service.id}
                    defaultChecked={selectedServiceIds.includes(service.id)}
                  />
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: service.color }}
                    />
                    {service.name}
                  </span>
                </label>
              ))}
            </div>
          )}
          <FieldError message={state.fieldErrors?.serviceIds} />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="is_active"
            name="is_active"
            defaultChecked={employee?.is_active ?? true}
          />
          <Label htmlFor="is_active" className="font-normal">
            Profesional activo y visible en la reserva pública
          </Label>
        </div>
      </div>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : employee ? (
            <Save className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {employee ? "Guardar cambios" : "Crear profesional"}
        </Button>
      </div>
    </form>
  );
}

export function EmployeeFormDialog({
  employee,
  services,
  selectedServiceIds,
  trigger,
}: {
  employee?: EmployeeRow;
  services: ServiceRow[];
  selectedServiceIds?: string[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> Nuevo profesional
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? "Editar profesional" : "Nuevo profesional"}</DialogTitle>
          <DialogDescription>
            Datos de contacto, especialidades y servicios que puede atender.
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm
          employee={employee}
          services={services}
          selectedServiceIds={selectedServiceIds}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteEmployeeButton({ employeeId }: { employeeId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Eliminar profesional"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Eliminar profesional"
      description="El profesional dejará de estar disponible. Puedes reactivarlo desde la lista."
      confirmLabel="Eliminar"
      onConfirm={() => deleteEmployeeAction(employeeId)}
    />
  );
}

export function RestoreEmployeeButton({ employeeId }: { employeeId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Reactivar profesional">
          <RotateCcw className="size-4" />
        </Button>
      }
      title="Reactivar profesional"
      description="El profesional volverá a estar disponible para nuevas reservas."
      confirmLabel="Reactivar"
      variant="default"
      successMessage="Profesional reactivado."
      onConfirm={() => restoreEmployeeAction(employeeId)}
    />
  );
}

export function EditEmployeeButton({
  employee,
  services,
  selectedServiceIds,
}: {
  employee: EmployeeRow;
  services: ServiceRow[];
  selectedServiceIds: string[];
}) {
  return (
    <EmployeeFormDialog
      employee={employee}
      services={services}
      selectedServiceIds={selectedServiceIds}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Editar profesional">
          <Pencil className="size-4" />
        </Button>
      }
    />
  );
}

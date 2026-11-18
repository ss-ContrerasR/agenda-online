"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  createEmployeeFromMemberAction,
  deleteEmployeeAction,
  restoreEmployeeAction,
  updateEmployeeAction,
} from "@/features/employees/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AppImage } from "@/components/shared/app-image";
import { initialActionState } from "@/lib/errors";
import type { EmployeeCandidate } from "@/features/employees/queries";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function EmployeeForm({
  employee,
  candidates = [],
  services,
  selectedServiceIds = [],
  onSuccess,
  onCancel,
}: {
  employee?: EmployeeRow;
  candidates?: EmployeeCandidate[];
  services: ServiceRow[];
  selectedServiceIds?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(employee);
  const firstCandidate = isEdit ? undefined : candidates[0];
  const action = employee ? updateEmployeeAction : createEmployeeFromMemberAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [memberId, setMemberId] = useState(firstCandidate?.membershipId ?? "");
  const [fullName, setFullName] = useState(
    employee?.full_name ?? firstCandidate?.fullName ?? "",
  );
  const [email, setEmail] = useState(
    employee?.email ?? firstCandidate?.email ?? "",
  );
  const [phone, setPhone] = useState(
    employee?.phone ?? firstCandidate?.phone ?? "",
  );
  const [photoUrl, setPhotoUrl] = useState(employee?.photo_url ?? "");
  const [color, setColor] = useState(employee?.color ?? "#0F766E");

  function handleCandidateChange(value: string) {
    setMemberId(value);
    const candidate = candidates.find((item) => item.membershipId === value);
    if (!candidate) return;
    setFullName(candidate.fullName);
    setEmail(candidate.email ?? "");
    setPhone(candidate.phone ?? "");
  }

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(
      state.message ?? (isEdit ? "Profesional guardado" : "Personal agregado"),
    );
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess, isEdit]);

  const canSubmit = isEdit || Boolean(memberId);

  return (
    <form action={formAction} className="space-y-4">
      {employee ? (
        <input type="hidden" name="employeeId" value={employee.id} />
      ) : (
        <input type="hidden" name="memberId" value={memberId} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isEdit ? null : (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="memberId">Cuenta de acceso *</Label>
            {candidates.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">
                    No hay cuentas con rol Empleado pendientes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Crea el usuario en{" "}
                    <Link
                      href="/dashboard/usuarios"
                      className="font-medium text-primary hover:underline"
                    >
                      Usuarios y roles
                    </Link>{" "}
                    y vuelve aquí para agregarlo al equipo.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Select value={memberId} onValueChange={handleCandidateChange}>
                  <SelectTrigger id="memberId" aria-label="Cuenta de acceso">
                    <SelectValue placeholder="Elige una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem
                        key={candidate.membershipId}
                        value={candidate.membershipId}
                      >
                        {candidate.fullName}
                        {candidate.email ? ` · ${candidate.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo aparecen cuentas con rol Empleado que aún no están en el
                  equipo.
                </p>
              </>
            )}
            <FieldError message={state.fieldErrors?.memberId} />
          </div>
        )}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="full_name">Nombre completo *</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            minLength={2}
            maxLength={120}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
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
            <AppImage
              src={photoUrl}
              alt="Vista previa"
              width={56}
              height={56}
              sizes="56px"
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
        <Button type="submit" disabled={pending || !canSubmit}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : employee ? (
            <Save className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {employee ? "Guardar cambios" : "Agregar al equipo"}
        </Button>
      </div>
    </form>
  );
}

export function EmployeeFormDialog({
  employee,
  candidates = [],
  services,
  selectedServiceIds,
  trigger,
}: {
  employee?: EmployeeRow;
  candidates?: EmployeeCandidate[];
  services: ServiceRow[];
  selectedServiceIds?: string[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(employee);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserRound className="size-4" /> Agregar personal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar profesional" : "Agregar personal"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Datos de contacto, especialidades y servicios que puede atender."
              : "Elige una cuenta con rol Empleado y completa su ficha del equipo."}
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm
          employee={employee}
          candidates={candidates}
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

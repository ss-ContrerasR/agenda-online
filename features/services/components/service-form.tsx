"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createServiceAction,
  deleteServiceAction,
  updateServiceAction,
} from "@/features/services/actions";
import { initialActionState, type ActionResult } from "@/lib/errors";
import type { EmployeeRow, ServiceCategoryRow, ServiceRow } from "@/types/database";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function ServiceFields({
  service,
  categories,
  employees,
  selectedEmployeeIds,
  state,
}: {
  service?: ServiceRow;
  categories: ServiceCategoryRow[];
  employees: EmployeeRow[];
  selectedEmployeeIds: string[];
  state: ActionResult;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {service ? <input type="hidden" name="serviceId" value={service.id} /> : null}

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="name">Nombre del servicio *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={service?.name}
          placeholder="Ej. Corte y peinado"
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category_id">Categoría</Label>
        <Select name="category_id" defaultValue={service?.category_id ?? "none"}>
          <SelectTrigger id="category_id">
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin categoría</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="color">Color</Label>
        <Input
          id="color"
          name="color"
          type="color"
          defaultValue={service?.color ?? "#0F766E"}
          className="h-9.5 w-full p-1"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="price">Precio *</Label>
        <Input
          id="price"
          name="price"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={service ? Number(service.price) : 0}
          aria-invalid={Boolean(state.fieldErrors?.price)}
        />
        {state.fieldErrors?.price ? (
          <p className="text-xs text-destructive">{state.fieldErrors.price}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="duration_minutes">Duración (min) *</Label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={5}
            max={1440}
            required
            defaultValue={service?.duration_minutes ?? 60}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="buffer_minutes">Buffer (min)</Label>
          <Input
            id="buffer_minutes"
            name="buffer_minutes"
            type="number"
            min={0}
            max={240}
            defaultValue={service?.buffer_minutes ?? 0}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sort_order">Orden</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          min={0}
          max={999}
          defaultValue={service?.sort_order ?? 0}
        />
      </div>

      <div className="flex items-center gap-2 pt-6">
        <Checkbox
          id="is_active"
          name="is_active"
          defaultChecked={service?.is_active ?? true}
        />
        <Label htmlFor="is_active" className="font-normal">
          Servicio activo y visible en la reserva pública
        </Label>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={service?.description ?? ""}
          placeholder="Describe brevemente el servicio"
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label>Profesionales que realizan este servicio</Label>
        {employees.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Primero crea integrantes del equipo para asignarlos.
          </p>
        ) : (
          <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
            {employees.map((employee) => (
              <label
                key={employee.id}
                className="flex items-center gap-2 text-sm"
                htmlFor={`employee-${employee.id}`}
              >
                <Checkbox
                  id={`employee-${employee.id}`}
                  name="employeeIds"
                  value={employee.id}
                  defaultChecked={selectedEmployeeIds.includes(employee.id)}
                />
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: employee.color }}
                  />
                  {employee.full_name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ServiceForm({
  mode,
  service,
  categories,
  employees,
  selectedEmployeeIds = [],
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  service?: ServiceRow;
  categories: ServiceCategoryRow[];
  employees: EmployeeRow[];
  selectedEmployeeIds?: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const action = mode === "create" ? createServiceAction : updateServiceAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Servicio guardado");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-5">
      <ServiceFields
        service={service}
        categories={categories}
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds}
        state={state}
      />
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
          ) : mode === "create" ? (
            <Plus className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {mode === "create" ? "Crear servicio" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

export function ServiceFormDialog({
  service,
  categories,
  employees,
  selectedEmployeeIds,
  trigger,
}: {
  service?: ServiceRow;
  categories: ServiceCategoryRow[];
  employees: EmployeeRow[];
  selectedEmployeeIds?: string[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="size-4" /> Nuevo servicio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            Define precio, duración y profesionales disponibles para este servicio.
          </DialogDescription>
        </DialogHeader>
        <ServiceForm
          mode={service ? "edit" : "create"}
          service={service}
          categories={categories}
          employees={employees}
          selectedEmployeeIds={selectedEmployeeIds}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const result = await deleteServiceAction(serviceId);
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Servicio eliminado");
      router.refresh();
    } else {
      toast.error(result.error ?? "No se pudo eliminar el servicio");
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Eliminar servicio"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
          <AlertDialogDescription>
            Las citas existentes conservarán el registro. El servicio dejará de estar
            disponible para nuevas reservas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

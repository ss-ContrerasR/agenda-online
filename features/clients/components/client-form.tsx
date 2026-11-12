"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  createClientAction,
  updateClientAction,
} from "@/features/clients/actions";
import { initialActionState, type ActionResult } from "@/lib/errors";
import type { ClientRow } from "@/types/database";
import { Button } from "@/components/ui/button";
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

function ClientFormFields({
  mode,
  client,
  state,
}: {
  mode: "create" | "edit";
  client?: ClientRow;
  state: ActionResult;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mode === "edit" && client ? (
        <input type="hidden" name="clientId" value={client.id} />
      ) : null}

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="full_name">Nombre completo *</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          defaultValue={client?.full_name}
          aria-invalid={Boolean(state.fieldErrors?.full_name)}
        />
        {state.fieldErrors?.full_name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.full_name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono *</Label>
        <Input
          id="phone"
          name="phone"
          required
          inputMode="tel"
          placeholder="+57 300 123 4567"
          defaultValue={client?.phone}
          aria-invalid={Boolean(state.fieldErrors?.phone)}
        />
        {state.fieldErrors?.phone ? (
          <p className="text-xs text-destructive">{state.fieldErrors.phone}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="document">Documento</Label>
        <Input id="document" name="document" defaultValue={client?.document ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="birth_date">Fecha de nacimiento</Label>
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          defaultValue={client?.birth_date ?? ""}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" defaultValue={client?.address ?? ""} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="notes">Notas visibles</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={client?.notes ?? ""}
          placeholder="Preferencias, alergias o indicaciones del cliente"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="internal_notes">Notas internas</Label>
        <Textarea
          id="internal_notes"
          name="internal_notes"
          rows={2}
          defaultValue={client?.internal_notes ?? ""}
          placeholder="Solo visible para el equipo"
        />
      </div>
    </div>
  );
}

export function ClientForm({
  mode,
  client,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  client?: ClientRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const action = mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Cliente guardado");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-5">
      <ClientFormFields mode={mode} client={client} state={state} />

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
            <UserPlus className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {mode === "create" ? "Crear cliente" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

export function ClientFormDialog({
  label = "Nuevo cliente",
  variant = "default",
  size = "sm",
}: {
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Plus className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Registra los datos del cliente para agendarle citas y llevar su historial.
          </DialogDescription>
        </DialogHeader>
        <ClientForm mode="create" onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

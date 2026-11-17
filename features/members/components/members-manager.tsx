"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, RotateCcw, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  addMemberByEmailAction,
  removeMemberAction,
  setMemberActiveAction,
  updateMemberRoleAction,
} from "@/features/members/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { initialActionState } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberRole } from "@/types/database";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES: MemberRole[] = ["owner", "admin", "receptionist", "employee"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function AddMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<MemberRole>("receptionist");
  const [state, formAction, pending] = useActionState(
    addMemberByEmailAction,
    initialActionState,
  );

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Miembro agregado");
    // Cierre del diálogo como reacción a una acción del servidor completada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    router.refresh();
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Agregar miembro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar miembro</DialogTitle>
          <DialogDescription>
            Busca un usuario registrado en la plataforma por su correo electrónico.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Correo electrónico *</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              required
              placeholder="nombre@ejemplo.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>
          <div className="space-y-1.5">
            <Label>Rol en la organización</Label>
            <Select value={role} onValueChange={(value) => setRole(value as MemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={state.fieldErrors?.role} />
          </div>

          {state.error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? "Buscando…" : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MemberRoleSelect({
  membershipId,
  role,
  disabled,
}: {
  membershipId: string;
  role: MemberRole;
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState(role);
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    const next = value as MemberRole;
    setCurrent(next);
    startTransition(async () => {
      const result = await updateMemberRoleAction(membershipId, next);
      if (result.ok) {
        toast.success(result.message ?? "Rol actualizado");
      } else {
        setCurrent(role);
        toast.error(result.error ?? "No se pudo actualizar el rol");
      }
    });
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled || pending}>
      <SelectTrigger className="h-8 w-36 text-xs" aria-label="Rol del miembro">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((item) => (
          <SelectItem key={item} value={item}>
            {ROLE_LABELS[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ToggleMemberActiveButton({
  membershipId,
  isActive,
  name,
}: {
  membershipId: string;
  isActive: boolean;
  name: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isActive ? "Desactivar miembro" : "Reactivar miembro"}
        >
          {isActive ? (
            <UserMinus className="size-4" />
          ) : (
            <RotateCcw className="size-4" />
          )}
        </Button>
      }
      title={isActive ? "Desactivar miembro" : "Reactivar miembro"}
      description={
        isActive
          ? `${name} perderá el acceso al panel mientras esté desactivado.`
          : `${name} volverá a tener acceso al panel.`
      }
      confirmLabel={isActive ? "Desactivar" : "Reactivar"}
      variant={isActive ? "destructive" : "default"}
      onConfirm={() => setMemberActiveAction(membershipId, !isActive)}
    />
  );
}

export function RemoveMemberButton({
  membershipId,
  name,
}: {
  membershipId: string;
  name: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Eliminar miembro"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Eliminar miembro"
      description={`${name} dejará de pertenecer a esta organización. Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      onConfirm={() => removeMemberAction(membershipId)}
    />
  );
}

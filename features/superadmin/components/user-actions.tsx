"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  reactivateUserAction,
  setUserMembershipStatusAction,
  suspendUserAction,
} from "../actions";
import {
  suspendUserSchema,
  type SuspendUserInput,
} from "../schemas";
import { MEMBERSHIP_STATUS_OPTIONS } from "../constants";
import type { MembershipStatus } from "@/types/database";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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

function SuspendUserDialog({
  userId,
  fullName,
  organizationId,
  compact,
}: {
  userId: string;
  fullName: string;
  organizationId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<SuspendUserInput>({
    resolver: zodResolver(suspendUserSchema),
    defaultValues: {
      userId,
      reason: "",
      until: "",
      organizationId: organizationId ?? "",
      confirm: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await suspendUserAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo suspender al usuario.");
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof SuspendUserInput, { message });
        }
      }
      return;
    }
    toast.success(result.message ?? "Usuario suspendido.");
    setOpen(false);
    form.reset();
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size={compact ? "sm" : "default"}>
          <Ban className="size-4" />
          {compact ? "Suspender" : "Suspender acceso"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender acceso de {fullName}</DialogTitle>
          <DialogDescription>
            El usuario perderá el acceso a todas las empresas de la plataforma de
            forma inmediata. Puedes definir una fecha de finalización para una
            suspensión temporal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register("userId")} />
          {organizationId ? (
            <input type="hidden" {...form.register("organizationId")} />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${userId}`}>Motivo de la suspensión *</Label>
            <Textarea
              id={`reason-${userId}`}
              rows={3}
              placeholder="Ej.: Incumplimiento de políticas de la plataforma"
              {...form.register("reason")}
              aria-invalid={Boolean(form.formState.errors.reason)}
            />
            <FieldError message={form.formState.errors.reason?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`until-${userId}`}>
              Hasta una fecha (opcional, suspensión temporal)
            </Label>
            <Input
              id={`until-${userId}`}
              type="date"
              {...form.register("until")}
              aria-invalid={Boolean(form.formState.errors.until)}
            />
            <p className="text-[11px] text-muted-foreground">
              Si se cumple la fecha, podrás reactivarlo manualmente desde esta consola.
            </p>
            <FieldError message={form.formState.errors.until?.message} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={form.watch("confirm")}
              onCheckedChange={(checked) =>
                form.setValue("confirm", checked === true, { shouldValidate: true })
              }
              className="mt-0.5"
            />
            <span>
              Confirmo que deseo bloquear el acceso de este usuario en todas las
              empresas.
              <FieldError message={form.formState.errors.confirm?.message} />
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar suspensión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MembershipSelect({
  userId,
  status,
}: {
  userId: string;
  status: MembershipStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(status);
  const [pending, startTransition] = useTransition();

  function update(next: string) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setUserMembershipStatusAction({
        userId,
        status: next as MembershipStatus,
      });
      if (!result.ok) {
        setValue(previous);
        toast.error(result.error ?? "No se pudo actualizar la membresía.");
        return;
      }
      toast.success(result.message ?? "Membresía actualizada.");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <Select value={value} onValueChange={update} disabled={pending}>
        <SelectTrigger className="h-8 w-36 text-xs" aria-label="Estado de membresía">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MEMBERSHIP_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <Loader2 className="absolute -right-5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}

export function UserActions({
  userId,
  fullName,
  membershipStatus,
  blocked,
  organizationId,
  compact = false,
}: {
  userId: string;
  fullName: string;
  membershipStatus: MembershipStatus;
  blocked: boolean;
  organizationId?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <MembershipSelect userId={userId} status={membershipStatus} />
      {blocked ? (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size={compact ? "sm" : "default"}>
              <RotateCcw className="size-4" />
              {compact ? "Reactivar" : "Reactivar acceso"}
            </Button>
          }
          title={`Reactivar acceso de ${fullName}`}
          description="El usuario volverá a tener acceso a las empresas donde es miembro activo."
          confirmLabel="Reactivar acceso"
          variant="default"
          successMessage="Acceso reactivado."
          onConfirm={() =>
            reactivateUserAction({
              userId,
              organizationId: organizationId || undefined,
            })
          }
        />
      ) : (
        <SuspendUserDialog
          userId={userId}
          fullName={fullName}
          organizationId={organizationId}
          compact={compact}
        />
      )}
    </div>
  );
}

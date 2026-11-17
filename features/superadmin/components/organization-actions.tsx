"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Ban, CreditCard, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  reactivateOrganizationAction,
  suspendOrganizationAction,
  updateOrganizationBillingAction,
} from "../actions";
import {
  suspendOrganizationSchema,
  updateOrganizationBillingSchema,
  type SuspendOrganizationInput,
  type UpdateOrganizationBillingInput,
} from "../schemas";
import { BILLING_STATUS_OPTIONS, formatPlatformDate } from "../constants";
import type { BillingStatus, OrganizationRow } from "@/types/database";
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

function BillingDialog({ organization }: { organization: OrganizationRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<UpdateOrganizationBillingInput>({
    resolver: zodResolver(updateOrganizationBillingSchema),
    defaultValues: {
      organizationId: organization.id,
      billingStatus: organization.billing_status,
      currentPeriodEnd: organization.current_period_end
        ? organization.current_period_end.slice(0, 10)
        : "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await updateOrganizationBillingAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo actualizar la facturación.");
      return;
    }
    toast.success(result.message ?? "Facturación actualizada.");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CreditCard className="size-4" />
          Facturación
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Facturación de {organization.name}</DialogTitle>
          <DialogDescription>
            Actualiza el estado de cobro y la fecha de fin del periodo contratado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register("organizationId")} />
          <div className="space-y-1.5">
            <Label>Estado de facturación</Label>
            <Select
              value={form.watch("billingStatus")}
              onValueChange={(value) =>
                form.setValue("billingStatus", value as BillingStatus, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={form.formState.errors.billingStatus?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`period-${organization.id}`}>Fin del periodo</Label>
            <Input
              id={`period-${organization.id}`}
              type="date"
              {...form.register("currentPeriodEnd")}
            />
            <FieldError message={form.formState.errors.currentPeriodEnd?.message} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuspendOrganizationDialog({ organization }: { organization: OrganizationRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<SuspendOrganizationInput>({
    resolver: zodResolver(suspendOrganizationSchema),
    defaultValues: {
      organizationId: organization.id,
      reason: "",
      confirm: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await suspendOrganizationAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo suspender la empresa.");
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof SuspendOrganizationInput, { message });
        }
      }
      return;
    }
    toast.success(result.message ?? "Empresa suspendida.");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Ban className="size-4" />
          Suspender
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender {organization.name}</DialogTitle>
          <DialogDescription>
            La empresa dejará de estar activa y su página pública de reservas dejará
            de aceptar citas. Esta acción quedará registrada en la auditoría.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register("organizationId")} />
          <div className="space-y-1.5">
            <Label htmlFor={`reason-org-${organization.id}`}>Motivo *</Label>
            <Textarea
              id={`reason-org-${organization.id}`}
              rows={3}
              placeholder="Ej.: Suscripción vencida sin respuesta del cliente"
              {...form.register("reason")}
            />
            <FieldError message={form.formState.errors.reason?.message} />
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
              Confirmo que deseo suspender el acceso de esta empresa.
              <FieldError message={form.formState.errors.confirm?.message} />
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Suspender empresa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrganizationActions({
  organization,
}: {
  organization: OrganizationRow;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BillingDialog organization={organization} />
      {organization.is_active ? (
        <SuspendOrganizationDialog organization={organization} />
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <RotateCcw className="size-4" />
              Reactivar
            </Button>
          }
          title={`Reactivar ${organization.name}`}
          description="La empresa volverá a estar activa y su sitio público aceptará reservas de nuevo."
          confirmLabel="Reactivar empresa"
          variant="default"
          successMessage="Empresa reactivada."
          onConfirm={() =>
            reactivateOrganizationAction({ organizationId: organization.id })
          }
        />
      )}
    </div>
  );
}

export function OrganizationSuspensionNote({
  organization,
}: {
  organization: OrganizationRow;
}) {
  if (organization.is_active) return null;
  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-xs text-destructive">
      Suspendida el {formatPlatformDate(organization.suspended_at, true)}
      {organization.suspended_reason ? ` · ${organization.suspended_reason}` : ""}
    </div>
  );
}

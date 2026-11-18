"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  Ban,
  CircleCheck,
  Loader2,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  reactivateOrganizationAction,
  saveOrganizationLicenseAction,
  suspendOrganizationAction,
} from "../actions";
import {
  saveOrganizationLicenseSchema,
  suspendOrganizationSchema,
  type SaveOrganizationLicenseInput,
  type SuspendOrganizationInput,
} from "../schemas";
import { InfoHint } from "@/components/shared/info-hint";
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
  addMonthsIso,
  LICENSE_PLAN_OPTIONS,
  toDateInput,
} from "@/lib/license";
import type { LicensePlan, OrganizationRow } from "@/types/database";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

const PRESETS: Array<{ label: string; plan: LicensePlan; months: number }> = [
  { label: "1 mes", plan: "monthly", months: 1 },
  { label: "2 meses", plan: "bimonthly", months: 2 },
  { label: "6 meses", plan: "semiannual", months: 6 },
  { label: "1 año", plan: "annual", months: 12 },
];

export function LicenseEditDialog({
  organization,
}: {
  organization: OrganizationRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<SaveOrganizationLicenseInput>({
    resolver: zodResolver(saveOrganizationLicenseSchema),
    defaultValues: {
      organizationId: organization.id,
      plan: organization.license_plan ?? "custom",
      startsAt:
        toDateInput(organization.license_start_at) ||
        toDateInput(organization.created_at),
      expiresAt:
        toDateInput(organization.license_expires_at) ||
        toDateInput(organization.current_period_end),
    },
  });

  const plan = useWatch({ control: form.control, name: "plan" });

  function applyPreset(plan: LicensePlan, months: number) {
    const today = new Date().toISOString();
    form.setValue("plan", plan, { shouldValidate: true });
    form.setValue("startsAt", toDateInput(today), { shouldValidate: true });
    form.setValue("expiresAt", toDateInput(addMonthsIso(today, months)), {
      shouldValidate: true,
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await saveOrganizationLicenseAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo guardar la licencia.");
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof SaveOrganizationLicenseInput, { message });
        }
      }
      return;
    }
    toast.success(result.message ?? "Licencia actualizada.");
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilLine className="size-4" />
          Configurar licencia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Licencia de {organization.name}</DialogTitle>
          <DialogDescription>
            Selecciona un plan rápido o ajusta las fechas a tu medida. El cliente
            verá la nueva fecha de pago al instante.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register("organizationId")} />

          <div className="space-y-1.5">
            <Label>Planes rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.plan, preset.months)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  form.setValue("plan", "custom", { shouldValidate: true })
                }
              >
                Personalizado
              </Button>
            </div>
            <InfoHint
              content="Los planes rápidos toman hoy como fecha de inicio. Después puedes cambiar cualquier fecha manualmente."
              label="Información sobre los planes"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`plan-${organization.id}`}>Plan de licencia</Label>
            <Select
              value={plan ?? "custom"}
              onValueChange={(value) =>
                form.setValue("plan", value as LicensePlan, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id={`plan-${organization.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_PLAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={form.formState.errors.plan?.message} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`start-${organization.id}`}>Fecha de inicio</Label>
              <Input
                id={`start-${organization.id}`}
                type="date"
                {...form.register("startsAt")}
              />
              <FieldError message={form.formState.errors.startsAt?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`expires-${organization.id}`}>Fecha de corte</Label>
              <Input
                id={`expires-${organization.id}`}
                type="date"
                {...form.register("expiresAt")}
              />
              <FieldError message={form.formState.errors.expiresAt?.message} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CircleCheck className="size-4" />
              )}
              Guardar licencia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LicenseSuspendDialog({
  organization,
}: {
  organization: OrganizationRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<SuspendOrganizationInput>({
    resolver: zodResolver(suspendOrganizationSchema),
    defaultValues: {
      organizationId: organization.id,
      reason: "Pago pendiente de la licencia",
      confirm: false,
    },
  });
  const confirm = useWatch({ control: form.control, name: "confirm" });

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
          <DialogTitle>Suspender a {organization.name}</DialogTitle>
          <DialogDescription>
            Su sitio público dejará de aceptar reservas y todo su sistema de
            trabajo quedará bloqueado hasta que lo reactives.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" {...form.register("organizationId")} />
          <div className="space-y-1.5">
            <Label htmlFor={`license-reason-${organization.id}`}>Motivo *</Label>
            <Textarea
              id={`license-reason-${organization.id}`}
              rows={3}
              {...form.register("reason")}
            />
            <FieldError message={form.formState.errors.reason?.message} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={confirm ?? false}
              onCheckedChange={(checked) =>
                form.setValue("confirm", checked === true, {
                  shouldValidate: true,
                })
              }
              className="mt-0.5"
            />
            <span>Confirmo que deseo suspender el acceso de esta empresa.</span>
          </label>
          <FieldError message={form.formState.errors.confirm?.message} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Suspender acceso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LicenseRowActions({
  organization,
}: {
  organization: OrganizationRow;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function reactivate() {
    setPending(true);
    const result = await reactivateOrganizationAction({
      organizationId: organization.id,
    });
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Empresa reactivada.");
      router.refresh();
    } else {
      toast.error(result.error ?? "No se pudo reactivar la empresa.");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <LicenseEditDialog organization={organization} />
      {organization.is_active &&
      organization.billing_status !== "suspended" &&
      organization.billing_status !== "cancelled" ? (
        <LicenseSuspendDialog organization={organization} />
      ) : (
        <Button variant="default" size="sm" onClick={reactivate} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          Activar
        </Button>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/features/settings/actions";
import { initialActionState } from "@/lib/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type {
  BookingConfirmationMode,
  OrganizationRow,
  OrganizationSettingsRow,
} from "@/types/database";

const TIMEZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Caracas",
  "America/Guayaquil",
  "America/Panama",
  "America/New_York",
  "Europe/Madrid",
  "UTC",
];

const CURRENCIES = ["COP", "MXN", "PEN", "CLP", "ARS", "USD", "EUR"];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/** Select de Radix que publica su valor en un input oculto del formulario. */
function FormSelect({
  name,
  value,
  onValueChange,
  options,
}: {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

function NumberField({
  id,
  label,
  name,
  defaultValue,
  hint,
  min = 0,
  max = 10080,
  error,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue: number;
  hint?: string;
  min?: number;
  max?: number;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  );
}

function ToggleField({
  id,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <Checkbox id={id} name={id} defaultChecked={defaultChecked} />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function SettingsForm({
  organization,
  settings,
  canEdit = true,
}: {
  organization: OrganizationRow;
  settings: OrganizationSettingsRow;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    initialActionState,
  );
  const [confirmationMode, setConfirmationMode] = useState<BookingConfirmationMode>(
    settings.confirmation_mode,
  );
  const [timezone, setTimezone] = useState(organization.timezone);
  const [currency, setCurrency] = useState(organization.currency);

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Configuración guardada");
    router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">
            <Building2 /> Datos del negocio
          </TabsTrigger>
          <TabsTrigger value="booking">
            <CalendarClock /> Reservas y notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <fieldset disabled={!canEdit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del negocio</CardTitle>
              <CardDescription>
                Estos datos aparecen en tu portal público y en el directorio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Nombre del negocio *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    defaultValue={organization.name}
                    aria-invalid={Boolean(state.fieldErrors?.name)}
                  />
                  <FieldError message={state.fieldErrors?.name} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="description">Descripción pública</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={1000}
                    defaultValue={organization.description ?? ""}
                    placeholder="Una breve descripción que aparece en el directorio"
                  />
                  <FieldError message={state.fieldErrors?.description} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="slug">Identificador público</Label>
                  <Input
                    id="slug"
                    value={organization.slug}
                    readOnly
                    className="bg-muted font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tu enlace público es <strong>/reservar/{organization.slug}</strong>.
                    No se puede modificar desde aquí.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" defaultValue={organization.phone ?? ""} />
                  <FieldError message={state.fieldErrors?.phone} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo de contacto</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={organization.email ?? ""}
                    aria-invalid={Boolean(state.fieldErrors?.email)}
                  />
                  <FieldError message={state.fieldErrors?.email} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={organization.address ?? ""}
                    placeholder="Calle 10 # 20-30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" name="city" defaultValue={organization.city ?? ""} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country">País</Label>
                  <Input id="country" name="country" defaultValue={organization.country ?? ""} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <FormSelect
                    name="timezone"
                    value={timezone}
                    onValueChange={setTimezone}
                    options={TIMEZONES.map((zone) => ({ value: zone, label: zone }))}
                  />
                  <FieldError message={state.fieldErrors?.timezone} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency">Moneda</Label>
                  <FormSelect
                    name="currency"
                    value={currency}
                    onValueChange={setCurrency}
                    options={CURRENCIES.map((code) => ({ value: code, label: code }))}
                  />
                  <FieldError message={state.fieldErrors?.currency} />
                </div>
              </div>
            </CardContent>
          </Card>
          </fieldset>
        </TabsContent>

        <TabsContent value="booking">
          <fieldset disabled={!canEdit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de reserva</CardTitle>
              <CardDescription>
                Define cómo se confirman las citas y los plazos aplicables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Confirmación de citas</Label>
                <FormSelect
                  name="confirmation_mode"
                  value={confirmationMode}
                  onValueChange={(value) =>
                    setConfirmationMode(value as BookingConfirmationMode)
                  }
                  options={[
                    { value: "automatic", label: "Automática" },
                    { value: "manual", label: "Requiere aprobación" },
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  Automática confirma al instante; manual deja la cita como pendiente.
                </p>
                <FieldError message={state.fieldErrors?.confirmation_mode} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  id="min_notice_minutes"
                  label="Anticipación mínima (min)"
                  name="min_notice_minutes"
                  defaultValue={settings.min_notice_minutes}
                  error={state.fieldErrors?.min_notice_minutes}
                />
                <NumberField
                  id="slot_interval_minutes"
                  label="Intervalo de horarios (min)"
                  name="slot_interval_minutes"
                  defaultValue={settings.slot_interval_minutes}
                  min={5}
                  max={120}
                  error={state.fieldErrors?.slot_interval_minutes}
                />
                <NumberField
                  id="max_advance_days"
                  label="Máximo de anticipación (días)"
                  name="max_advance_days"
                  defaultValue={settings.max_advance_days}
                  min={1}
                  max={365}
                  error={state.fieldErrors?.max_advance_days}
                />
                <NumberField
                  id="buffer_minutes"
                  label="Margen entre citas (min)"
                  name="buffer_minutes"
                  defaultValue={settings.buffer_minutes}
                  max={240}
                  error={state.fieldErrors?.buffer_minutes}
                />
                <NumberField
                  id="cancellation_notice_hours"
                  label="Cancelación (horas)"
                  name="cancellation_notice_hours"
                  defaultValue={settings.cancellation_notice_hours}
                  error={state.fieldErrors?.cancellation_notice_hours}
                />
                <NumberField
                  id="reschedule_notice_hours"
                  label="Reprogramación (horas)"
                  name="reschedule_notice_hours"
                  defaultValue={settings.reschedule_notice_hours}
                  error={state.fieldErrors?.reschedule_notice_hours}
                />
                <NumberField
                  id="reminder_hours"
                  label="Recordatorio (horas antes)"
                  name="reminder_hours"
                  defaultValue={settings.reminder_hours}
                  max={168}
                  error={state.fieldErrors?.reminder_hours}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="policy_text">Política de reservas</Label>
                <Textarea
                  id="policy_text"
                  name="policy_text"
                  rows={4}
                  maxLength={4000}
                  defaultValue={settings.policy_text ?? ""}
                  placeholder="Términos y condiciones que verá el cliente al reservar"
                />
                <FieldError message={state.fieldErrors?.policy_text} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferencias públicas y notificaciones</CardTitle>
              <CardDescription>
                Controla qué se muestra en el portal de reservas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <ToggleField
                id="allow_employee_selection"
                label="Elegir profesional"
                description="El cliente puede seleccionar quién lo atiende."
                defaultChecked={settings.allow_employee_selection}
              />
              <ToggleField
                id="show_prices"
                label="Mostrar precios"
                description="Los precios son visibles en el catálogo público."
                defaultChecked={settings.show_prices}
              />
              <ToggleField
                id="show_employees"
                label="Mostrar equipo"
                description="Se muestra el perfil de los profesionales."
                defaultChecked={settings.show_employees}
              />
              <ToggleField
                id="email_notifications"
                label="Notificaciones por correo"
                description="Envía correos de confirmación y recordatorio."
                defaultChecked={settings.email_notifications}
              />
            </CardContent>
          </Card>
          </fieldset>
        </TabsContent>
      </Tabs>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

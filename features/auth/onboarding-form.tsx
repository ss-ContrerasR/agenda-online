"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import { completeOnboardingAction } from "@/features/auth/actions";
import { initialActionState } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIMEZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Caracas",
  "America/Panama",
  "America/Guayaquil",
  "America/Santo_Domingo",
  "America/New_York",
  "Europe/Madrid",
];

const CURRENCIES = [
  { value: "COP", label: "COP — Peso colombiano" },
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "USD", label: "USD — Dólar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "PEN", label: "PEN — Sol peruano" },
  { value: "CLP", label: "CLP — Peso chileno" },
  { value: "ARS", label: "ARS — Peso argentino" },
];

export function OnboardingForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, formAction] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  const [name, setName] = useState(defaultName);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Building2 className="size-3.5" /> Paso final
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configura tu negocio
        </h1>
        <p className="text-sm text-muted-foreground">
          Crea el espacio de {email}. Podrás completar el resto en configuración.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del negocio</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Estudio Aurora"
            aria-invalid={Boolean(state.fieldErrors?.name)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Página pública:{" "}
            <span className="font-mono">/reservar/{slugify(name) || "mi-negocio"}</span>
          </p>
          {state.fieldErrors?.name ? (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input id="phone" name="phone" placeholder="+57 601 555 0000" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Zona horaria</Label>
            <Select name="timezone" defaultValue="America/Bogota">
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>
                    {timezone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select name="currency" defaultValue="COP">
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {state.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" size="lg">
          Crear mi negocio
        </Button>
      </form>
    </div>
  );
}

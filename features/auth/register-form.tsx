"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { signUpAction } from "@/features/auth/actions";
import { initialActionState } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, initialActionState);

  if (state.ok && state.message) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button asChild variant="outline">
          <Link href="/login">Volver a iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Configura tu negocio en menos de un minuto.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            placeholder="Laura Mendoza"
            aria-invalid={Boolean(state.fieldErrors?.full_name)}
            required
          />
          {state.fieldErrors?.full_name ? (
            <p className="text-xs text-destructive">{state.fieldErrors.full_name}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@negocio.com"
            aria-invalid={Boolean(state.fieldErrors?.email)}
            required
          />
          {state.fieldErrors?.email ? (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={Boolean(state.fieldErrors?.password)}
            required
          />
          {state.fieldErrors?.password ? (
            <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirmar contraseña</Label>
          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(state.fieldErrors?.confirm_password)}
            required
          />
          {state.fieldErrors?.confirm_password ? (
            <p className="text-xs text-destructive">
              {state.fieldErrors.confirm_password}
            </p>
          ) : null}
        </div>

        {state.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" size="lg">
          Crear cuenta
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Al crear tu cuenta aceptas nuestras políticas de uso y privacidad.
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}

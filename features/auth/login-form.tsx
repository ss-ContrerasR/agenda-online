"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { signInAction } from "@/features/auth/actions";
import { initialActionState } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { label: "Propietaria", email: "owner@estudioaurora.com" },
  { label: "Recepción", email: "recepcion@estudioaurora.com" },
  { label: "Empleada", email: "valeria@estudioaurora.com" },
  { label: "Superadmin", email: "admin@agendapro.co" },
];

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialActionState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Demo1234!");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa para administrar tu agenda y tus reservas.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@negocio.com"
              className="pl-9"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.email)}
              required
            />
          </div>
          {state.fieldErrors?.email ? (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="px-9"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.password)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {state.fieldErrors?.password ? (
            <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
          ) : null}
        </div>

        {state.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.error}
          </div>
        ) : null}

        <Button type="submit" className="w-full" size="lg">
          Iniciar sesión
        </Button>
      </form>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">
          Cuentas de demostración · contraseña <span className="font-mono">Demo1234!</span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account.email)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-left text-[11px] leading-tight transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <span className="block font-medium">{account.label}</span>
              <span className="block truncate text-muted-foreground">{account.email}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary hover:underline">
          Crea tu negocio
        </Link>
      </p>
    </div>
  );
}

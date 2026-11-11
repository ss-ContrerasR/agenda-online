import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, KeyRound, Server } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Configuración requerida",
  robots: { index: false, follow: false },
};

const REQUIRED_VARS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    hint: "URL del proyecto Supabase (Settings → API).",
    configured: () => isSupabaseConfigured,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    hint: "Clave pública anon del proyecto.",
    configured: () => isSupabaseConfigured,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    hint: "Solo servidor. Necesaria para reservas públicas y tareas internas.",
    configured: () =>
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.length),
  },
] as const;

export default function ConfigurationRequiredPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-10 sm:px-8">
        <Badge variant="warning" className="w-fit">
          <Server className="size-3" /> Entorno sin configurar
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Falta conectar AgendaPro con Supabase
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          El panel y las páginas públicas necesitan credenciales de Supabase para
          funcionar. Añade las variables en{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            .env.local
          </code>{" "}
          (o en tu proveedor de hosting) y reinicia el servidor.
        </p>

        <div className="mt-6 space-y-2.5">
          {REQUIRED_VARS.map((item) => {
            const ready = item.configured();
            return (
              <div
                key={item.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span
                  className={
                    ready
                      ? "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  }
                >
                  {ready ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <KeyRound className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium">{item.key}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.hint}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-[11px] font-medium text-muted-foreground">
                  {ready ? "Detectada" : "Pendiente"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Copy className="size-4 text-muted-foreground" /> Pasos rápidos
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>Copia las credenciales desde el panel de tu proyecto Supabase.</li>
            <li>
              Ejecuta las migraciones de{" "}
              <code className="font-mono">supabase/migrations</code> y el seed.
            </li>
            <li>Reinicia <code className="font-mono">pnpm dev</code> y recarga esta página.</li>
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/">Reintentar</Link>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer noopener"
            >
              Abrir Supabase <ExternalLink />
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Ir al inicio de sesión</Link>
          </Button>
        </div>
      </main>

      <footer className="px-5 py-5 text-center text-xs text-muted-foreground sm:px-8">
        © {new Date().getFullYear()} AgendaPro. Consulta el README para la guía
        de instalación completa.
      </footer>
    </div>
  );
}

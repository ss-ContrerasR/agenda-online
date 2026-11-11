import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-slate-100 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(45,212,191,0.22),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(14,165,233,0.18),transparent_45%)]"
        />
        <div className="relative">
          <Logo href="/" className="text-white [&_span:last-child]:text-white" />
        </div>
        <div className="relative max-w-md space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-teal-200">
            <Sparkles className="size-3.5" /> Plataforma de reservas
          </span>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
            Tu agenda, tus clientes y tus números en un solo lugar.
          </h2>
          <ul className="space-y-3 text-sm text-slate-300">
            {[
              "Reservas en línea 24/7 con disponibilidad real.",
              "Cada negocio con su propia identidad visual.",
              "Control de accesos por roles y datos aislados.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="size-4" />
          Autenticación y datos protegidos con Supabase.
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col bg-background">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Logo />
            </div>
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
            >
              <ArrowLeft className="size-4" /> Volver al inicio
            </Link>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <footer className="px-5 py-5 text-center text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} AgendaPro. Todos los derechos reservados.
        </footer>
      </main>
    </div>
  );
}

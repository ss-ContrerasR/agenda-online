import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  CreditCard,
  Globe2,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME, DEMO_ORG_SLUG } from "@/lib/env";

export const metadata: Metadata = {
  title: `${APP_NAME} — Citas y reservas para tu negocio`,
  description:
    "Agenda, confirma y gestiona las citas de tu negocio desde un solo lugar. Reservas en línea 24/7, agenda inteligente, clientes y reportes.",
  openGraph: {
    title: `${APP_NAME} — Citas y reservas para tu negocio`,
    description:
      "Reservas en línea 24/7, agenda inteligente, clientes, equipo y reportes en una plataforma multi-negocio.",
    type: "website",
  },
};

const MODULES = [
  {
    icon: CalendarRange,
    title: "Agenda inteligente",
    text: "Vista mensual, semanal y diaria con disponibilidad real y protección contra citas duplicadas.",
  },
  {
    icon: Globe2,
    title: "Reservas 24/7",
    text: "Cada negocio obtiene su propia página pública para reservar sin llamadas ni mensajes.",
  },
  {
    icon: Users,
    title: "Clientes y equipo",
    text: "Historial de cada cliente, servicios por profesional, horarios y vacaciones.",
  },
  {
    icon: BarChart3,
    title: "Reportes claros",
    text: "Ingresos, ocupación y servicios más pedidos, con exportación a CSV.",
  },
  {
    icon: Palette,
    title: "Identidad propia",
    text: "Colores, logo y textos personalizados para que cada negocio se vea como su marca.",
  },
  {
    icon: ShieldCheck,
    title: "Aislamiento por negocio",
    text: "Roles, permisos y políticas de base de datos que separan los datos de cada organización.",
  },
];

const STEPS = [
  {
    title: "Configura tu negocio",
    text: "Define servicios, precios, duración, profesionales y horario de atención.",
  },
  {
    title: "Comparte tu enlace",
    text: `Tu página pública queda lista en /reservar/tu-negocio para que tus clientes reserven.`,
  },
  {
    title: "Gestiona el día a día",
    text: "Confirma citas, registra asistencias y revisa tus métricas desde el panel.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm">
              <a href="#modulos">Módulos</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#como-funciona">Cómo funciona</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/reservar/${DEMO_ORG_SLUG}`}>Reserva demo</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-border bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(45,212,191,0.28),transparent_45%),radial-gradient(circle_at_90%_100%,rgba(14,165,233,0.22),transparent_45%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Badge className="border-white/20 bg-white/10 text-white">
                <Sparkles className="size-3" /> Plataforma multi-negocio
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                Menos llamadas, más citas en tu agenda
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                {APP_NAME} reúne reservas en línea, agenda, clientes, equipo,
                reportes y personalización de marca en un solo lugar. Diseñada
                para estudios, barberías, clínicas y cualquier negocio que viva
                de su tiempo.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/registro">
                    Empezar ahora <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                >
                  <Link href={`/reservar/${DEMO_ORG_SLUG}`}>
                    Ver reserva de ejemplo
                  </Link>
                </Button>
              </div>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
                {[
                  "Sin tarjeta para explorar",
                  "Disponibilidad en tiempo real",
                  "Roles y permisos incluidos",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-teal-300" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-white/15 bg-white/8 p-3 shadow-2xl backdrop-blur">
                <div className="rounded-xl bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <LayoutDashboard className="size-4" /> Resumen de hoy
                    </div>
                    <span className="rounded-full bg-teal-400/15 px-2 py-0.5 text-[10px] font-medium text-teal-200">
                      En vivo
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { label: "Citas", value: "12" },
                      { label: "Ingresos", value: "$ 840" },
                      { label: "Ocupación", value: "78%" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                      >
                        <p className="text-[10px] text-white/50">{stat.label}</p>
                        <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { time: "09:00", name: "Corte y barba", who: "Carlos M." },
                      { time: "10:30", name: "Color completo", who: "Laura G." },
                      { time: "12:00", name: "Manicure spa", who: "Ana R." },
                    ].map((row) => (
                      <div
                        key={row.time}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <span className="text-xs font-medium text-teal-200">
                          {row.time}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {row.name}
                        </span>
                        <span className="truncate text-[10px] text-white/50">
                          {row.who}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid gap-3 sm:grid-cols-3">
            <Highlight
              icon={Clock3}
              title="Reservas 24/7"
              text="Tus clientes eligen horario sin esperar respuesta."
            />
            <Highlight
              icon={CalendarDays}
              title="Sin sobreventa"
              text="La disponibilidad se calcula en el servidor y se protege en la base de datos."
            />
            <Highlight
              icon={CreditCard}
              title="Listo para crecer"
              text="Multi-negocio, multi-sucursal y con roles para todo tu equipo."
            />
          </div>
        </section>

        <section id="modulos" className="scroll-mt-24 border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                Todo incluido
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Un panel para operar, cobrar y crecer
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Sin hojas de cálculo ni mensajes cruzados. Cada módulo está
                conectado con la agenda real de tu negocio.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((module) => (
                <div
                  key={module.title}
                  className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <module.icon className="size-5" />
                  </span>
                  <h3 className="mt-3 font-medium">{module.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {module.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                Cómo funciona
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                En marcha en tres pasos
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Crea tu cuenta, completa la configuración del negocio y comparte
                tu enlace. El panel queda listo para tu equipo.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/registro">
                    Crear mi cuenta <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Ya tengo cuenta</Link>
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-slate-950 text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 sm:py-14 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-balance">
                Tu próxima cita empieza aquí
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/70">
                Configura tu negocio en minutos y empieza a recibir reservas en
                línea hoy mismo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/registro">Crear cuenta gratis</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href={`/reservar/${DEMO_ORG_SLUG}`}>Ver demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo compact />
            <p>
              © {new Date().getFullYear()} {APP_NAME}. Citas y reservas para
              negocios que viven de su tiempo.
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="hover:text-foreground">
              Crear cuenta
            </Link>
            <Link href={`/reservar/${DEMO_ORG_SLUG}`} className="hover:text-foreground">
              Reserva demo
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Clock3;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

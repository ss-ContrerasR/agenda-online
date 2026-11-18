import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CalendarCheck2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { BusinessDirectory } from "@/features/public-booking/components/business-directory";
import { listPublicOrganizations } from "@/features/public-booking/queries";
import { getCurrentYear } from "@/lib/year";

export const metadata: Metadata = {
  title: "Explorar negocios | AgendaTEX",
  description:
    "Descubre negocios activos en AgendaTEX y reserva tu próxima cita en línea.",
};

export default async function BusinessesPage() {
  const [organizations, year] = await Promise.all([
    listPublicOrganizations(),
    getCurrentYear(),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarCheck2 className="size-4.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">AgendaTEX</span>
              <span className="block text-[11px] text-muted-foreground">
                Directorio de negocios
              </span>
            </span>
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Acceso al panel
          </Link>
        </div>
      </header>

      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Building2 className="size-3.5" />
            Directorio de la plataforma
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Encuentra un negocio y reserva tu próxima cita
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explora los negocios activos en AgendaTEX, compara sus servicios y
            elige el horario que mejor te funcione.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Search className="size-3.5" />
              Busca por nombre, ciudad o servicio
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              Solo negocios activos y al corriente
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {organizations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm font-medium">Aún no hay negocios publicados</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vuelve pronto para descubrir nuevos espacios donde reservar.
            </p>
          </div>
        ) : (
          <BusinessDirectory organizations={organizations} />
        )}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {year} AgendaTEX. Reservas gestionadas en línea.</p>
          <div className="flex items-center gap-4">
            <Link href="/negocios" className="hover:text-foreground">
              Explorar negocios
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Acceso al panel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

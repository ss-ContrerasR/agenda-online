import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ManageAppointment } from "@/features/public-booking/manage-appointment";
import { getAppointmentByToken } from "@/features/public-booking/queries";
import { themeCss } from "@/lib/theme";
import { formatDateInTz, formatTimeInTz, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gestionar mi cita",
  description: "Consulta, reprograma o cancela tu cita en línea.",
  robots: { index: false, follow: false },
};

export default function ManageAppointmentPage({
  params,
}: PageProps<"/reservar/[slug]/cita/[token]">) {
  return (
    <Suspense fallback={<ManageSkeleton />}>
      <ManageContent params={params} />
    </Suspense>
  );
}

async function ManageContent({
  params,
}: {
  params: PageProps<"/reservar/[slug]/cita/[token]">["params"];
}) {
  const { slug, token } = await params;
  const details = await getAppointmentByToken(token, slug);

  if (!details) notFound();

  const { appointment, organization, settings } = details;
  const now = new Date();
  const minDate = formatInTimeZone(now, organization.timezone, "yyyy-MM-dd");
  const maxDate = formatInTimeZone(
    addDays(now, settings.max_advance_days),
    organization.timezone,
    "yyyy-MM-dd",
  );
  const forceDark =
    settings.public_theme === "dark" && settings.dark_mode_enabled;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: themeCss(
            settings.brand_primary,
            settings.brand_secondary,
            settings.brand_accent,
          ),
        }}
      />
      <div className={forceDark ? "dark" : undefined}>
        <div className="min-h-dvh bg-background">
          <header className="border-b border-border/70 bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
              <Link
                href={`/reservar/${organization.slug}`}
                className="flex min-w-0 items-center gap-2.5"
              >
                <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  {organization.logo_url ? (
                    <Image
                      src={organization.logo_url}
                      alt={organization.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    initials(organization.name)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {organization.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    Gestión de tu cita
                  </span>
                </span>
              </Link>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/reservar/${organization.slug}`}>
                  <ArrowLeft className="size-4" /> Volver
                </Link>
              </Button>
            </div>
          </header>

          <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
            <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">
                {formatDateInTz(
                  appointment.starts_at,
                  organization.timezone,
                  "EEEE d 'de' MMMM",
                )}{" "}
                · {formatTimeInTz(appointment.starts_at, organization.timezone)}
              </p>
              <p className="text-xs text-muted-foreground">
                Cita en {organization.name}. Puedes reprogramar o cancelar según
                la política del negocio.
              </p>
            </div>

            <ManageAppointment
              details={details}
              minDate={minDate}
              maxDate={maxDate}
            />
          </main>

          <footer className="border-t border-border bg-card">
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
              <p>
                © {new Date().getFullYear()} {organization.name}. Reservas
                gestionadas con{" "}
                <Link href="/" className="font-medium text-primary hover:underline">
                  AgendaPro
                </Link>
                .
              </p>
              <Link
                href={`/reservar/${organization.slug}`}
                className="hover:text-foreground"
              >
                Reservar otra cita
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

function ManageSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="h-16 border-b border-border">
        <div className="mx-auto flex h-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6 sm:py-12">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

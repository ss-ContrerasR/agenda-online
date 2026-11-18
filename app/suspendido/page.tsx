import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Ban, CalendarClock, LifeBuoy, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PaymentContactLink } from "@/components/shared/payment-contact-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cuenta suspendida",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    org?: string | string[];
    expires?: string | string[];
  }>;
};

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(iso: string | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    dateStyle: "long",
  }).format(date);
}

async function SuspendedContent({ searchParams }: Props) {
  const params = await searchParams;
  const organizationName = singleParam(params.org)?.trim() || "mi empresa";
  const expiresLabel = formatDate(singleParam(params.expires));

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Ban className="size-7" />
            </span>
            <CardTitle className="mt-3 text-xl">Tu cuenta está suspendida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              El acceso al panel y al sitio de reservas de{" "}
              <strong className="text-foreground">{organizationName}</strong> está
              pausado temporalmente. Esto puede ocurrir por un pago pendiente o
              por una revisión de la cuenta.
            </p>
            {expiresLabel ? (
              <p className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <CalendarClock className="size-4 text-primary" />
                Fecha de pago o renovación:{" "}
                <strong>{expiresLabel}</strong>
              </p>
            ) : null}
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-left text-sm">
              <p className="flex items-center gap-2 font-medium">
                <LifeBuoy className="size-4 text-primary" />
                ¿Qué puedes hacer?
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                <li>Escribe por WhatsApp para regularizar tu licencia.</li>
                <li>La reactivación del sistema la realiza la plataforma tras el pago.</li>
                <li>Tus datos, citas e historial se conservan intactos.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <PaymentContactLink
                organizationName={organizationName}
                label="Realizar pago por WhatsApp"
                size="lg"
                className="w-full sm:w-auto"
              />
              <Button asChild variant="outline" size="lg">
                <Link href="/login">
                  <LogOut /> Volver al inicio de sesión
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function SuspendedPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <SuspendedContent {...props} />
    </Suspense>
  );
}

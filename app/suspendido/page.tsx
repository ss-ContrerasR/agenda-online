import type { Metadata } from "next";
import Link from "next/link";
import { Ban, LifeBuoy, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cuenta suspendida",
  robots: { index: false, follow: false },
};

export default function SuspendedPage() {
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
              El acceso a tu panel y a tus reservas quedó pausado temporalmente.
              Esto puede ocurrir por un pago pendiente o por una revisión de la
              cuenta.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-left text-sm">
              <p className="flex items-center gap-2 font-medium">
                <LifeBuoy className="size-4 text-primary" />
                ¿Qué puedes hacer?
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                <li>Regulariza tu membresía para reactivar el servicio al instante.</li>
                <li>Escribe al equipo de soporte si crees que es un error.</li>
                <li>Tus datos y tu historial se conservan intactos.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <a href="mailto:soporte@agendapro.co">Contactar soporte</a>
              </Button>
              <Button asChild variant="outline">
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

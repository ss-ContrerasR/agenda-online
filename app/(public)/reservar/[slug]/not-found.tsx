import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function PublicNotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarX2 className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Esta página de reservas no está disponible
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            El enlace puede ser incorrecto o el negocio ya no está aceptando
            reservas en línea. Verifica la dirección o contacta directamente al
            negocio.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TourStep = { title: string; description: string };

const DASHBOARD_STEPS: TourStep[] = [
  {
    title: "Resumen",
    description:
      "Tu panel principal. Aquí ves citas del día, ingresos, clientes recientes y accesos rápidos. El banner de licencia te avisa de tu prueba, vencimiento o fecha de pago.",
  },
  {
    title: "Citas",
    description:
      "Consulta, crea, reprograma y cancela citas. La agenda abre en las próximas 4 semanas. Un correo con cita activa no puede agendar otra hasta que se complete o cancele.",
  },
  {
    title: "Clientes",
    description:
      "Guarda la ficha de tus clientes: datos de contacto, notas e historial de citas. Desde aquí también puedes dar de alta nuevos clientes.",
  },
  {
    title: "Servicios",
    description:
      "Define los servicios que ofreces, su precio, duración, color y categoría. Estos datos alimentan el sitio público de reservas y la agenda.",
  },
  {
    title: "Equipo",
    description:
      "Registra profesionales y empleados, así como los servicios que cada uno atiende. Pueden tener usuario de acceso o ser solo personal operativo.",
  },
  {
    title: "Horarios",
    description:
      "Configura la disponibilidad general, los horarios por profesional, descansos y días excepcionales. El asistente público respeta estos horarios.",
  },
  {
    title: "Reportes",
    description:
      "Analiza citas, ocupación e ingresos. Por defecto consulta los últimos 30 días para que puedas comparar el rendimiento del negocio.",
  },
  {
    title: "Configuración",
    description:
      "Ajusta la confirmación automática o manual de reservas, anticipación mínima, políticas de cancelación y notificaciones.",
  },
  {
    title: "Apariencia",
    description:
      "Personaliza colores, logo, portada, textos y redes sociales de tu sitio público de reservas.",
  },
  {
    title: "Usuarios y roles",
    description:
      "Invita usuarios existentes o crea cuentas nuevas con contraseña temporal. Asigna roles de propietario, administrador, recepcionista o empleado, y activa o desactiva el acceso.",
  },
  {
    title: "Página de reservas y ayuda",
    description:
      "El enlace 'Página de reservas' abre el sitio público de tu negocio. El icono 'i' junto a cada opción explica para qué sirve, y este tour está siempre disponible en la barra superior.",
  },
];

const ADMIN_STEPS: TourStep[] = [
  {
    title: "Resumen de plataforma",
    description:
      "Métricas globales: empresas, usuarios, citas e ingresos. También encontrarás accesos rápidos y el estado de suspensiones.",
  },
  {
    title: "Empresas",
    description:
      "Listado de todos los negocios clientes. Puedes buscar, filtrar, crear empresas con propietario, ver el detalle y suspender o reactivar el acceso.",
  },
  {
    title: "Licencias",
    description:
      "Centro de venta de licencias. Define inicio y vencimiento, elige plan (mensual, 2 meses, semestral, anual o personalizado), consulta cuándo vence y suspende o reactiva el sistema completo del cliente.",
  },
  {
    title: "Usuarios y accesos",
    description:
      "Administra cuentas de la plataforma, estados de membresía y suspensiones individuales con su historial.",
  },
  {
    title: "Auditoría",
    description:
      "Registro de acciones sensibles: creación de empresas, cambios de licencia, suspensiones y reactivaciones.",
  },
];

const SITE_STEPS: TourStep[] = [
  {
    title: "Portada",
    description:
      "Conoce la plataforma y entra al directorio de negocios, a tu panel o a la página de reservas de una empresa.",
  },
  {
    title: "Directorio de negocios",
    description:
      "Explora las empresas activas, busca por nombre y abre su sitio público para comparar servicios antes de reservar.",
  },
  {
    title: "Sitio de reservas",
    description:
      "En /reservar/<slug> eliges servicio, profesional, fecha y horario. Si el correo ya tiene una cita activa, el asistente te lo avisa antes de continuar.",
  },
  {
    title: "Gestionar tu cita",
    description:
      "Con el token privado que recibes por correo puedes ver, cancelar o reprogramar tu reserva desde /reservar/<slug>/cita/<token>.",
  },
  {
    title: "Acceso y licencias",
    description:
      "Regístrate y configura tu negocio en /onboarding para obtener 7 días de prueba. Si tu acceso está suspendido, /suspendido muestra la fecha de pago y el contacto de WhatsApp.",
  },
  {
    title: "Ayuda permanente",
    description:
      "Este botón flotante está disponible en todas las páginas públicas y de acceso. Dentro del panel y de la consola hay un 'Tour guiado' en la barra superior y un icono 'i' en cada opción.",
  },
];

export function GuidedTour({
  variant = "dashboard",
  isPlatformAdmin = false,
  floating = false,
}: {
  variant?: "dashboard" | "admin" | "site";
  isPlatformAdmin?: boolean;
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps =
    variant === "admin"
      ? ADMIN_STEPS
      : variant === "site"
        ? SITE_STEPS
        : [...DASHBOARD_STEPS, ...(isPlatformAdmin ? ADMIN_STEPS : [])];

  const current = steps[step] ?? steps[0];
  const last = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setStep(0);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={floating ? "default" : "outline"}
          size={floating ? "icon" : "sm"}
          aria-label="Abrir tour guiado"
          className={cn(
            floating &&
              "fixed bottom-4 left-4 z-40 !size-12 rounded-full shadow-lg sm:bottom-6 sm:left-6",
          )}
        >
          <Compass className={floating ? "size-5" : "size-4"} />
          {!floating ? (
            <span className="hidden sm:inline">Tour guiado</span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {current.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Paso {step + 1} de {steps.length}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft className="size-4" />
              Anterior
            </Button>
            {last ? (
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Finalizar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
              >
                Siguiente
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

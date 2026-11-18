import type { ReactNode } from "react";
import { InfoHint } from "@/components/shared/info-hint";
import { cn } from "@/lib/utils";

const PAGE_HELP: Record<string, string> = {
  "Resumen del negocio":
    "Indicadores de hoy y de los últimos 30 días. Revisa aquí el aviso de prueba o vencimiento de tu licencia.",
  Reportes:
    "Estadísticas de citas e ingresos de los últimos 30 días. Cambia el periodo para comparar resultados.",
  Citas:
    "Agenda de trabajo. Puedes crear citas, filtrar por estado y abrir cada reserva para reprogramarla o cancelarla.",
  "Nueva cita":
    "Registra una cita manual. El sistema valida horarios, disponibilidad y que el correo no tenga otra cita activa.",
  Clientes:
    "Base de datos de tus clientes. Guarda teléfono, correo, notas y consulta su historial de reservas.",
  "Ficha del cliente":
    "Datos de contacto y citas de este cliente. Desde aquí puedes editarlo o agendarle una cita.",
  Servicios:
    "Catálogo público y privado. Define precio, duración y si el servicio aparece en la página de reservas.",
  Categorías:
    "Agrupa tus servicios por tipo. Aquí puedes crear, editar, ordenar y eliminar categorías del catálogo.",
  Equipo:
    "Profesionales del negocio. Asigna servicios, especialidades y controla su disponibilidad.",
  Horarios:
    "Define cuándo atiende el negocio y cada profesional, incluidos descansos y fechas especiales.",
  "Usuarios y permisos":
    "Crea cuentas nuevas con contraseña temporal o agrega usuarios existentes. Asigna roles y controla su acceso.",
  Configuración:
    "Reglas de reserva, confirmación, notificaciones y datos generales de la organización.",
  Apariencia:
    "Personaliza colores, portada, logo y textos del sitio público de reservas.",
  Correos:
    "Diseña la plantilla de tus correos (logo, colores, textos y disposición), previsualízala y envía mensajes con el correo del propietario.",
  "Detalle de la cita":
    "Información completa de la reserva. Puedes cambiar su estado, reprogramarla o cancelarla.",
  "Editar cita":
    "Modifica fecha, hora, profesional o notas. Se valida nuevamente la disponibilidad.",
  Empresas:
    "Todas las organizaciones clientes. Consulta su estado, sitio público y datos de facturación.",
  Licencias:
    "Administra inicio, vencimiento y plan de licencia. También puedes suspender o reactivar el sistema del cliente.",
  "Detalle de empresa":
    "Ficha del cliente: miembros, métricas, licencia y acciones de suspensión.",
  "Usuarios y accesos":
    "Cuentas de la plataforma, membresías y suspensiones individuales.",
  Auditoría:
    "Historial de cambios sensibles realizados desde la consola de plataforma.",
};

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
  help,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
  help?: string;
}) {
  const helpContent =
    help ??
    PAGE_HELP[title] ??
    (title.startsWith("Hola,")
      ? PAGE_HELP["Resumen del negocio"]
      : undefined);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-balance sm:text-[26px]">
          {title}
          {helpContent ? (
            <InfoHint content={helpContent} label={`Información sobre ${title}`} />
          ) : null}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

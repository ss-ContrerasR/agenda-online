"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { CalendarAppointment } from "@/features/appointments/components/calendar";

/**
 * El calendario solo se descarga cuando el usuario elige una vista de mes,
 * semana o día. El listado (vista por defecto) no paga el costo de date-fns ni
 * de los cálculos de la rejilla.
 */
export const AppointmentCalendar = dynamic(
  () =>
    import("@/features/appointments/components/calendar").then(
      (module) => module.AppointmentCalendar,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3" aria-hidden>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[520px] w-full rounded-xl" />
      </div>
    ),
  },
);

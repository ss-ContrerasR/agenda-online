"use client";

import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts es una de las dependencias más pesadas del panel. Se carga después
 * de la hidratación para que las tarjetas y la agenda aparezcan primero.
 */
export const OverviewCharts = dynamic(
  () =>
    import("@/features/dashboard/components/overview-charts").then(
      (module) => module.OverviewCharts,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-3" aria-hidden>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad del período</CardTitle>
            <CardDescription>Citas e ingresos registrados por día.</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estado de las citas</CardTitle>
            <CardDescription>Distribución del período.</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="mx-auto h-[220px] w-[220px] rounded-full" />
          </CardContent>
        </Card>
      </div>
    ),
  },
);

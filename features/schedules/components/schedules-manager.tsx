"use client";

import { CalendarClock, CalendarOff, Clock3, UsersRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessHoursForm } from "@/features/schedules/components/business-hours-form";
import { EmployeeSchedules } from "@/features/schedules/components/employee-schedules";
import { ScheduleBreaks } from "@/features/schedules/components/schedule-breaks";
import { ScheduleExceptions } from "@/features/schedules/components/schedule-exceptions";
import type {
  BusinessHoursRow,
  EmployeeRow,
  EmployeeScheduleRow,
  ScheduleBreakRow,
  ScheduleExceptionRow,
} from "@/types/database";

export function SchedulesManager({
  employees,
  businessHours,
  employeeSchedules,
  breaks,
  exceptions,
  today,
  canWrite,
}: {
  employees: EmployeeRow[];
  businessHours: BusinessHoursRow[];
  employeeSchedules: EmployeeScheduleRow[];
  breaks: ScheduleBreakRow[];
  exceptions: ScheduleExceptionRow[];
  today: string;
  canWrite: boolean;
}) {
  return (
    <Tabs defaultValue="business" className="space-y-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="business">
          <Clock3 /> Horario del negocio
        </TabsTrigger>
        <TabsTrigger value="employees">
          <UsersRound /> Profesionales
        </TabsTrigger>
        <TabsTrigger value="breaks">
          <CalendarClock /> Descansos
        </TabsTrigger>
        <TabsTrigger value="exceptions">
          <CalendarOff /> Excepciones
        </TabsTrigger>
      </TabsList>

      <TabsContent value="business">
        <BusinessHoursForm rows={businessHours} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="employees">
        <EmployeeSchedules
          employees={employees}
          schedules={employeeSchedules}
          canWrite={canWrite}
        />
      </TabsContent>
      <TabsContent value="breaks">
        <ScheduleBreaks employees={employees} breaks={breaks} canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="exceptions">
        <ScheduleExceptions
          employees={employees}
          exceptions={exceptions}
          today={today}
          canWrite={canWrite}
        />
      </TabsContent>
    </Tabs>
  );
}

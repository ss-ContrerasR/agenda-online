import { addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type WeeklyHours = {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
};

export type EmployeeAvailability = {
  employeeId: string;
  weekly: Array<{
    weekday: number;
    isWorking: boolean;
    startTime: string;
    endTime: string;
  }>;
  breaks: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
  }>;
};

export type ScheduleExceptionInput = {
  employeeId: string | null;
  date: string;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type BusyInterval = {
  employeeId: string;
  startsAt: string;
  endsAt: string;
};

export type AvailabilityInput = {
  date: string;
  timezone: string;
  now: Date;
  serviceDuration: number;
  serviceBufferMinutes: number;
  organizationBufferMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  businessHours: WeeklyHours[];
  employees: EmployeeAvailability[];
  exceptions: ScheduleExceptionInput[];
  busy: BusyInterval[];
};

export type AvailabilitySlot = {
  /** Inicio en ISO UTC. */
  start: string;
  /** Fin del servicio (sin buffer) en ISO UTC. */
  end: string;
  /** Empleados disponibles para este inicio. */
  employeeIds: string[];
};

export function timeToMinutes(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function minutesToTime(totalMinutes: number): string {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function getWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function localToUtc(date: string, minutesFromMidnight: number, timezone: string) {
  return fromZonedTime(
    `${date}T${minutesToTime(minutesFromMidnight)}:00`,
    timezone,
  );
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && endA > startB;
}

type DayWindow = {
  employeeId: string;
  start: number;
  end: number;
  breaks: Array<{ start: number; end: number }>;
};

function resolveEmployeeWindow(
  employee: EmployeeAvailability,
  weekday: number,
  businessHours: WeeklyHours[],
): { start: number; end: number; breaks: Array<{ start: number; end: number }> } | null {
  const business = businessHours.find((row) => row.weekday === weekday);
  const schedule = employee.weekly.find((row) => row.weekday === weekday);

  let start: number;
  let end: number;

  if (schedule) {
    if (!schedule.isWorking) return null;
    start = timeToMinutes(schedule.startTime);
    end = timeToMinutes(schedule.endTime);
  } else if (business?.isOpen) {
    start = timeToMinutes(business.openTime);
    end = timeToMinutes(business.closeTime);
  } else {
    return null;
  }

  if (!business?.isOpen) return null;

  // El empleado nunca puede atender fuera del horario del negocio.
  start = Math.max(start, timeToMinutes(business.openTime));
  end = Math.min(end, timeToMinutes(business.closeTime));
  if (end <= start) return null;

  const breaks: Array<{ start: number; end: number }> = [];
  if (business.breakStart && business.breakEnd) {
    breaks.push({
      start: timeToMinutes(business.breakStart),
      end: timeToMinutes(business.breakEnd),
    });
  }
  for (const item of employee.breaks) {
    if (item.weekday === weekday) {
      breaks.push({
        start: timeToMinutes(item.startTime),
        end: timeToMinutes(item.endTime),
      });
    }
  }

  return { start, end, breaks };
}

/**
 * Calcula los horarios disponibles de un día. Es una función pura: toda la
 * información (horarios, ausencias, citas) debe llegar desde la base de datos.
 * Se ejecuta exclusivamente en el servidor dentro de Server Actions/Pages.
 */
export function calculateAvailability(
  input: AvailabilityInput,
): AvailabilitySlot[] {
  if (input.serviceDuration <= 0) return [];

  const weekday = getWeekday(input.date);
  const todayInZone = formatInTimeZone(input.now, input.timezone, "yyyy-MM-dd");

  if (input.date < todayInZone) return [];

  const maxDate = formatInTimeZone(
    addDaysToDate(input.now, input.maxAdvanceDays, input.timezone),
    input.timezone,
    "yyyy-MM-dd",
  );
  if (input.date > maxDate) return [];

  const noticeThreshold =
    input.now.getTime() + Math.max(0, input.minNoticeMinutes) * 60_000;
  const buffer = Math.max(
    input.serviceBufferMinutes,
    input.organizationBufferMinutes,
  );
  const blockedDuration = input.serviceDuration + buffer;
  const interval = Math.max(5, input.slotIntervalMinutes);

  const windows: DayWindow[] = [];

  for (const employee of input.employees) {
    const exception = input.exceptions.find(
      (item) =>
        item.date === input.date &&
        item.employeeId === employee.employeeId,
    );
    const globalException = input.exceptions.find(
      (item) => item.date === input.date && item.employeeId === null,
    );

    if (exception?.isClosed || globalException?.isClosed) continue;

    let window = resolveEmployeeWindow(employee, weekday, input.businessHours);
    if (!window) continue;

    const override = exception ?? globalException;
    if (override && !override.isClosed && override.startTime && override.endTime) {
      const overrideStart = timeToMinutes(override.startTime);
      const overrideEnd = timeToMinutes(override.endTime);
      window = {
        ...window,
        start: Math.max(window.start, overrideStart),
        end: Math.min(window.end, overrideEnd),
      };
    }

    if (window.end <= window.start) continue;
    windows.push({ employeeId: employee.employeeId, ...window });
  }

  if (windows.length === 0) return [];

  const slots = new Map<string, AvailabilitySlot>();

  for (const window of windows) {
    const busy = input.busy.filter(
      (item) => item.employeeId === window.employeeId,
    );

    for (
      let minute = window.start;
      minute + input.serviceDuration <= window.end;
      minute += interval
    ) {
      const serviceEnd = minute + input.serviceDuration;
      const blockedEnd = minute + blockedDuration;

      if (
        window.breaks.some((br) =>
          overlaps(minute, blockedEnd, br.start, br.end),
        )
      ) {
        continue;
      }

      const hasConflict = busy.some((item) => {
        const busyStart = timeToMinutes(
          formatInTimeZone(new Date(item.startsAt), input.timezone, "HH:mm"),
        );
        const busyEnd = timeToMinutes(
          formatInTimeZone(new Date(item.endsAt), input.timezone, "HH:mm"),
        );
        if (!overlaps(minute, blockedEnd, busyStart, busyEnd)) return false;

        // Las citas se guardan con fecha; comparamos también el día real.
        const busyDate = formatInTimeZone(
          new Date(item.startsAt),
          input.timezone,
          "yyyy-MM-dd",
        );
        return busyDate === input.date;
      });

      if (hasConflict) continue;

      const start = localToUtc(input.date, minute, input.timezone);
      if (start.getTime() < noticeThreshold) continue;

      const end = localToUtc(input.date, serviceEnd, input.timezone);
      const key = start.toISOString();
      const existing = slots.get(key);
      if (existing) {
        existing.employeeIds.push(window.employeeId);
      } else {
        slots.set(key, {
          start: key,
          end: end.toISOString(),
          employeeIds: [window.employeeId],
        });
      }
    }
  }

  return Array.from(slots.values()).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
}

function addDaysToDate(now: Date, days: number, timezone: string) {
  const date = new Date(now.getTime() + days * 86_400_000);
  void timezone;
  return date;
}

export function groupSlotsByPeriod(slots: AvailabilitySlot[], timezone: string) {
  const groups = {
    morning: [] as AvailabilitySlot[],
    afternoon: [] as AvailabilitySlot[],
    evening: [] as AvailabilitySlot[],
  };

  for (const slot of slots) {
    const hour = Number(formatInTimeZone(new Date(slot.start), timezone, "H"));
    if (hour < 12) groups.morning.push(slot);
    else if (hour < 18) groups.afternoon.push(slot);
    else groups.evening.push(slot);
  }

  return groups;
}

export function isSlotAvailable(
  slots: AvailabilitySlot[],
  start: string,
  employeeId?: string,
) {
  const slot = slots.find(
    (item) => new Date(item.start).getTime() === new Date(start).getTime(),
  );
  if (!slot) return null;
  if (employeeId && !slot.employeeIds.includes(employeeId)) return null;
  return slot;
}

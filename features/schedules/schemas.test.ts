import { describe, expect, it } from "vitest";
import {
  businessHoursSchema,
  employeeScheduleSchema,
  scheduleBreakSchema,
  scheduleExceptionSchema,
} from "./schemas";

describe("schedules schemas", () => {
  it("acepta horas de PostgreSQL con segundos y las normaliza a HH:mm", () => {
    const result = businessHoursSchema.safeParse({
      weekday: "1",
      is_open: "on",
      open_time: "09:00:00",
      close_time: "18:30:00",
      break_start: "13:00:00",
      break_end: "14:00:00",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.open_time).toBe("09:00");
      expect(result.data.close_time).toBe("18:30");
      expect(result.data.break_start).toBe("13:00");
      expect(result.data.break_end).toBe("14:00");
    }
  });

  it("acepta un horario de profesional con segundos", () => {
    const result = employeeScheduleSchema.safeParse({
      employee_id: "a1000000-0000-4000-8000-000000000001",
      weekday: "2",
      is_working: "on",
      start_time: "08:00:00",
      end_time: "16:00:00",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start_time).toBe("08:00");
      expect(result.data.end_time).toBe("16:00");
    }
  });

  it("permite crear un descanso sin breakId", () => {
    const result = scheduleBreakSchema.safeParse({
      employee_id: "",
      weekday: "1",
      start_time: "13:00",
      end_time: "14:00",
      label: "Almuerzo",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.breakId).toBeNull();
  });

  it("permite crear una festividad sin exceptionId", () => {
    const result = scheduleExceptionSchema.safeParse({
      exception_date: "2026-12-25",
      is_closed: "on",
      start_time: "",
      end_time: "",
      reason: "Navidad",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exceptionId).toBeNull();
      expect(result.data.employee_id).toBeNull();
      expect(result.data.start_time).toBeNull();
    }
  });
});

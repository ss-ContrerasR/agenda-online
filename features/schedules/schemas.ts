import { z } from "zod";
import {
  checkboxField,
  dateField,
  formDataObject,
  optionalText,
  uuidField,
} from "@/lib/form";

// PostgreSQL `time` devuelve "09:00:00". El input HTML usa "09:00": aceptamos
// ambos formatos y normalizamos a HH:mm antes de validar rangos y de guardar.
const timeValue = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora inválida")
  .transform((value) => value.slice(0, 5));
const weekdayField = z.coerce.number().int().min(0).max(6);
const nullableTime = z
  .union([timeValue, z.literal("")])
  .optional()
  .transform((value) => (value ? value : null));
const nullableUuid = z
  .union([uuidField, z.literal("")])
  .optional()
  .transform((value) => (value ? value : null));

export const businessHoursSchema = z
  .object({
    weekday: weekdayField,
    is_open: checkboxField,
    open_time: timeValue,
    close_time: timeValue,
    break_start: nullableTime,
    break_end: nullableTime,
  })
  .refine((value) => value.close_time > value.open_time, {
    message: "La hora de cierre debe ser mayor a la de apertura",
    path: ["close_time"],
  })
  .refine(
    (value) =>
      !(value.break_start || value.break_end) ||
      (value.break_start !== null &&
        value.break_end !== null &&
        value.break_end > value.break_start),
    {
      message: "Revisa el rango del descanso",
      path: ["break_end"],
    },
  );

export const employeeScheduleSchema = z
  .object({
    employee_id: uuidField,
    weekday: weekdayField,
    is_working: checkboxField,
    start_time: timeValue,
    end_time: timeValue,
  })
  .refine((value) => value.end_time > value.start_time, {
    message: "La hora final debe ser mayor a la inicial",
    path: ["end_time"],
  });

export const scheduleBreakSchema = z
  .object({
    breakId: nullableUuid,
    employee_id: nullableUuid,
    weekday: weekdayField,
    start_time: timeValue,
    end_time: timeValue,
    label: optionalText,
  })
  .refine((value) => value.end_time > value.start_time, {
    message: "La hora final debe ser mayor a la inicial",
    path: ["end_time"],
  });

export const scheduleExceptionSchema = z
  .object({
    exceptionId: nullableUuid,
    employee_id: nullableUuid,
    exception_date: dateField,
    is_closed: checkboxField,
    start_time: nullableTime,
    end_time: nullableTime,
    reason: optionalText,
  })
  .refine(
    (value) =>
      value.is_closed ||
      (value.start_time !== null &&
        value.end_time !== null &&
        value.end_time > value.start_time),
    {
      message: "Indica un horario especial válido",
      path: ["start_time"],
    },
  );

export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;
export type EmployeeScheduleInput = z.infer<typeof employeeScheduleSchema>;
export type ScheduleBreakInput = z.infer<typeof scheduleBreakSchema>;
export type ScheduleExceptionInput = z.infer<typeof scheduleExceptionSchema>;

export function parseScheduleForm(formData: FormData) {
  return formDataObject(formData);
}

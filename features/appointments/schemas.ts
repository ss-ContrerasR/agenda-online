import { z } from "zod";
import {
  dateField,
  optionalText,
  timeField,
  uuidField,
} from "@/lib/form";

export const appointmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const createAppointmentSchema = z.object({
  clientId: uuidField,
  serviceId: uuidField,
  employeeId: uuidField,
  date: dateField,
  time: timeField,
  status: z.enum(["pending", "confirmed"]).default("confirmed"),
  notes: optionalText,
  internalNotes: optionalText,
});

export const updateAppointmentSchema = createAppointmentSchema.extend({
  appointmentId: uuidField,
});

export const rescheduleAppointmentSchema = z.object({
  appointmentId: uuidField,
  date: dateField,
  time: timeField,
  reason: optionalText,
});

export const changeStatusSchema = z.object({
  appointmentId: uuidField,
  status: appointmentStatusSchema,
  note: optionalText,
});

export const appointmentFilterSchema = z.object({
  status: appointmentStatusSchema.optional().catch(undefined),
  employeeId: uuidField.optional().catch(undefined),
  serviceId: uuidField.optional().catch(undefined),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

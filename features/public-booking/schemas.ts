import { z } from "zod";
import { dateField, uuidField } from "@/lib/form";

const slugField = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Negocio inválido");

export const slotsRequestSchema = z.object({
  slug: slugField,
  serviceId: uuidField,
  employeeId: uuidField.nullable().optional(),
  date: dateField,
});

export const rescheduleSlotsRequestSchema = z.object({
  slug: slugField,
  token: uuidField,
  date: dateField,
});

export const publicBookingSchema = z.object({
  slug: slugField,
  serviceId: uuidField,
  employeeId: uuidField.nullable().optional(),
  start: z.iso.datetime({ offset: true, message: "Horario inválido" }),
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre completo")
    .max(120, "Máximo 120 caracteres"),
  email: z.email("Ingresa un correo válido"),
  phone: z
    .string()
    .trim()
    .min(7, "Ingresa un teléfono válido")
    .max(30, "Teléfono demasiado largo"),
  notes: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .transform((value) => (value ? value : null)),
  policyAccepted: z.literal(true, {
    message: "Debes aceptar la política de la cita",
  }),
});

export const bookingDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre completo")
    .max(120, "Máximo 120 caracteres"),
  email: z.email("Ingresa un correo válido"),
  phone: z
    .string()
    .trim()
    .min(7, "Ingresa un teléfono válido")
    .max(30, "Teléfono demasiado largo"),
  notes: z.string().trim().max(500, "Máximo 500 caracteres"),
  policyAccepted: z
    .boolean()
    .refine((value) => value === true, "Debes aceptar la política de la cita"),
});

export const cancelPublicAppointmentSchema = z.object({
  slug: slugField,
  token: uuidField,
  reason: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : null)),
});

export const reschedulePublicAppointmentSchema = z.object({
  slug: slugField,
  token: uuidField,
  start: z.iso.datetime({ offset: true, message: "Horario inválido" }),
});

export type SlotsRequest = z.infer<typeof slotsRequestSchema>;
export type RescheduleSlotsRequest = z.infer<typeof rescheduleSlotsRequestSchema>;
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
export type CancelPublicAppointmentInput = z.infer<
  typeof cancelPublicAppointmentSchema
>;
export type ReschedulePublicAppointmentInput = z.infer<
  typeof reschedulePublicAppointmentSchema
>;

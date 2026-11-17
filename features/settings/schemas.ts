import { z } from "zod";
import {
  checkboxField,
  formDataObject,
  optionalEmail,
  optionalText,
} from "@/lib/form";

/** El slug público se muestra solo lectura en el panel. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del negocio").max(120),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción es demasiado larga")
    .optional()
    .transform((value) => (value ? value : null)),
  phone: optionalText,
  email: optionalEmail,
  address: optionalText,
  city: optionalText,
  country: optionalText,
  timezone: z.string().trim().min(1, "Selecciona una zona horaria"),
  currency: z
    .string()
    .trim()
    .length(3, "La moneda debe tener 3 letras")
    .transform((value) => value.toUpperCase()),
});

export const bookingSettingsSchema = z.object({
  confirmation_mode: z.enum(["automatic", "manual"]),
  min_notice_minutes: z.coerce.number().int().min(0).max(10080),
  slot_interval_minutes: z.coerce.number().int().min(5).max(120),
  max_advance_days: z.coerce.number().int().min(1).max(365),
  buffer_minutes: z.coerce.number().int().min(0).max(240),
  cancellation_notice_hours: z.coerce.number().int().min(0).max(720),
  reschedule_notice_hours: z.coerce.number().int().min(0).max(720),
  policy_text: z
    .string()
    .trim()
    .max(4000, "La política es demasiado larga")
    .optional()
    .transform((value) => (value ? value : null)),
  allow_employee_selection: checkboxField,
  show_prices: checkboxField,
  show_employees: checkboxField,
  email_notifications: checkboxField,
  reminder_hours: z.coerce.number().int().min(0).max(168),
});

export const settingsSchema = organizationSchema.merge(bookingSettingsSchema);

export type SettingsInput = z.infer<typeof settingsSchema>;

export function parseSettingsForm(formData: FormData) {
  return formDataObject(formData);
}

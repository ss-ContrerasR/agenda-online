import { z } from "zod";

export function formDataObject(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export const checkboxField = z.preprocess(
  (value) => value === "on" || value === "true" || value === true,
  z.boolean(),
);

export const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.union([z.null(), z.email("Ingresa un correo válido")]));

export const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora inválida");

export const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido");

export const uuidField = z.uuid("Identificador inválido");

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

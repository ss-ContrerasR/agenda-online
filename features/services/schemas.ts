import { z } from "zod";
import { checkboxField, hexColor, optionalText, uuidField } from "@/lib/form";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre").max(80),
  description: optionalText,
  color: hexColor.default("#0F766E"),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
});

export const updateCategorySchema = categorySchema.extend({
  categoryId: uuidField,
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre").max(120),
  category_id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.union([z.null(), uuidField])),
  description: optionalText,
  price: z.coerce.number().min(0, "El precio no puede ser negativo").max(100_000_000),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 minutos")
    .max(1440, "Máximo 24 horas"),
  buffer_minutes: z.coerce.number().int().min(0).max(240).default(0),
  color: hexColor.default("#0F766E"),
  is_active: checkboxField.default(false),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  employeeIds: z.array(uuidField).default([]),
});

export const updateServiceSchema = serviceSchema.extend({
  serviceId: uuidField,
});

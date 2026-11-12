import { z } from "zod";
import { optionalEmail, optionalText } from "@/lib/form";

export const clientSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresa el nombre completo").max(120),
  email: optionalEmail,
  phone: z.string().trim().min(6, "Ingresa un teléfono válido").max(30),
  document: optionalText,
  birth_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  address: optionalText,
  notes: optionalText,
  internal_notes: optionalText,
});

export const updateClientSchema = clientSchema.extend({
  clientId: z.uuid("Cliente inválido"),
});

export type ClientInput = z.infer<typeof clientSchema>;

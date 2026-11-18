import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre completo.")
    .max(120, "El nombre es demasiado largo."),
  phone: z
    .string()
    .trim()
    .max(30, "El teléfono es demasiado largo.")
    .optional()
    .transform((value) => (value ? value : null)),
});

export type ProfileInput = z.infer<typeof profileSchema>;

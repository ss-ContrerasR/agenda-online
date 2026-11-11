import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Ingresa tu nombre completo")
      .max(120),
    email: z.email("Ingresa un correo válido"),
    password: z
      .string()
      .min(8, "Usa al menos 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Las contraseñas no coinciden",
  });

export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre del negocio")
    .max(120),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
  currency: z.string().length(3, "Moneda inválida"),
  phone: z.string().trim().max(30).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

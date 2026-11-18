import { z } from "zod";
import { formDataObject, uuidField } from "@/lib/form";

export const memberRoleSchema = z.enum([
  "owner",
  "admin",
  "receptionist",
  "employee",
]);

export const assignableRoleSchema = z.enum([
  "owner",
  "admin",
  "receptionist",
  "employee",
]);

export const updateMemberRoleSchema = z.object({
  membershipId: uuidField,
  role: memberRoleSchema,
});

export const setMemberActiveSchema = z.object({
  membershipId: uuidField,
  isActive: z.boolean(),
});

export const addMemberSchema = z.object({
  email: z.email("Ingresa un correo válido").transform((value) =>
    value.trim().toLowerCase(),
  ),
  role: assignableRoleSchema,
});

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre completo").max(120),
  email: z.email("Ingresa un correo válido").transform((value) =>
    value.trim().toLowerCase(),
  ),
  password: z
    .union([
      z.literal(""),
      z
        .string()
        .min(8, "La contraseña temporal debe tener al menos 8 caracteres")
        .max(72, "La contraseña es demasiado larga"),
    ])
    .optional(),
  role: assignableRoleSchema,
  phone: z.string().trim().max(30, "El teléfono es demasiado largo").optional(),
});

export function parseAddMemberForm(formData: FormData) {
  return formDataObject(formData);
}

export function parseCreateUserForm(formData: FormData) {
  return formDataObject(formData);
}

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

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

export function parseAddMemberForm(formData: FormData) {
  return formDataObject(formData);
}

export type AddMemberInput = z.infer<typeof addMemberSchema>;

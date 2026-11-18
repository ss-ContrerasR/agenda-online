import { z } from "zod";
import {
  checkboxField,
  formDataObject,
  hexColor,
  optionalEmail,
  optionalText,
  uuidField,
} from "@/lib/form";

export const employeeSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresa el nombre completo").max(120),
  email: optionalEmail,
  phone: optionalText,
  position: optionalText,
  bio: optionalText,
  photo_url: optionalText,
  specialties: z.array(z.string().trim().min(1).max(40)).max(20),
  color: hexColor,
  is_active: checkboxField,
  serviceIds: z.array(uuidField),
});

export const updateEmployeeSchema = employeeSchema.extend({
  employeeId: uuidField,
});

/** Alta de personal a partir de una cuenta con rol Empleado. */
export const createEmployeeFromMemberSchema = employeeSchema.extend({
  memberId: uuidField,
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

/** Convierte los campos del formulario (incluidos los multiselect) en datos de Zod. */
export function parseEmployeeForm(formData: FormData) {
  const values = formDataObject(formData);
  const specialties = (values.specialties ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    ...values,
    specialties,
    serviceIds: formData.getAll("serviceIds").map(String),
  };
}

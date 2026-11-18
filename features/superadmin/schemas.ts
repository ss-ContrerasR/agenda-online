import { z } from "zod";

const BILLING_VALUES = [
  "active",
  "trialing",
  "past_due",
  "suspended",
  "cancelled",
] as const;

const MEMBERSHIP_VALUES = [
  "active",
  "trialing",
  "past_due",
  "suspended",
  "cancelled",
] as const;

const LICENSE_PLAN_VALUES = [
  "trial",
  "monthly",
  "bimonthly",
  "semiannual",
  "annual",
  "custom",
] as const;

const CURRENCY_VALUES = [
  "COP",
  "USD",
  "EUR",
  "MXN",
  "ARS",
  "CLP",
  "PEN",
] as const;

const optionalLine = z.string().trim().max(160).optional();
const optionalEmail = z.union([z.email("Ingresa un correo válido"), z.literal("")]).optional();

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de la empresa")
    .max(120, "El nombre es demasiado largo"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Usa letras minúsculas, números y guiones (sin espacios)",
    )
    .max(60),
  email: optionalEmail,
  phone: z.string().trim().max(30, "El teléfono es demasiado largo").optional(),
  city: optionalLine,
  timezone: z.string().trim().min(1, "Selecciona una zona horaria"),
  currency: z.enum(CURRENCY_VALUES),
  ownerEmail: optionalEmail,
  ownerName: optionalLine,
  confirm: z.boolean().refine((value) => value, "Confirma la creación de la empresa"),
});

export const suspendUserSchema = z.object({
  userId: z.uuid("Usuario inválido"),
  reason: z
    .string()
    .trim()
    .min(5, "Explica el motivo (mínimo 5 caracteres)")
    .max(500, "El motivo es demasiado largo"),
  until: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal("")),
  organizationId: z.uuid().optional().or(z.literal("")),
  confirm: z.boolean().refine((value) => value, "Debes confirmar la suspensión"),
});

export const reactivateUserSchema = z.object({
  userId: z.uuid("Usuario inválido"),
  organizationId: z.uuid().optional().or(z.literal("")),
});

export const setMembershipStatusSchema = z.object({
  userId: z.uuid("Usuario inválido"),
  status: z.enum(MEMBERSHIP_VALUES),
});

export const suspendOrganizationSchema = z.object({
  organizationId: z.uuid("Empresa inválida"),
  reason: z
    .string()
    .trim()
    .min(5, "Explica el motivo (mínimo 5 caracteres)")
    .max(500, "El motivo es demasiado largo"),
  confirm: z.boolean().refine((value) => value, "Debes confirmar la suspensión"),
});

export const reactivateOrganizationSchema = z.object({
  organizationId: z.uuid("Empresa inválida"),
});

export const updateOrganizationBillingSchema = z.object({
  organizationId: z.uuid("Empresa inválida"),
  billingStatus: z.enum(BILLING_VALUES),
  currentPeriodEnd: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .optional()
    .or(z.literal("")),
});

const licenseDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const saveOrganizationLicenseSchema = z
  .object({
    organizationId: z.uuid("Empresa inválida"),
    plan: z.enum(LICENSE_PLAN_VALUES),
    startsAt: licenseDate,
    expiresAt: licenseDate,
  })
  .refine(
    (value) =>
      new Date(`${value.expiresAt}T23:59:59.999Z`).getTime() >
      new Date(`${value.startsAt}T00:00:00.000Z`).getTime(),
    {
      message: "El vencimiento debe ser posterior al inicio.",
      path: ["expiresAt"],
    },
  );

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
export type SuspendUserInput = z.input<typeof suspendUserSchema>;
export type ReactivateUserInput = z.input<typeof reactivateUserSchema>;
export type SetMembershipStatusInput = z.input<typeof setMembershipStatusSchema>;
export type SuspendOrganizationInput = z.input<typeof suspendOrganizationSchema>;
export type ReactivateOrganizationInput = z.input<typeof reactivateOrganizationSchema>;
export type UpdateOrganizationBillingInput = z.input<
  typeof updateOrganizationBillingSchema
>;
export type SaveOrganizationLicenseInput = z.infer<
  typeof saveOrganizationLicenseSchema
>;

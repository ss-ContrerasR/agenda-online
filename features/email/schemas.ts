import { z } from "zod";
import {
  checkboxField,
  formDataObject,
  hexColor,
  optionalEmail,
} from "@/lib/form";
import type { EmailSocial } from "@/lib/email/config";

function optionalMax(max: number, message?: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : null));
}

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.union([z.null(), z.url("Ingresa una URL válida (https://...)")]));

export const SOCIAL_FIELDS = [
  { key: "social_instagram", label: "Instagram" },
  { key: "social_facebook", label: "Facebook" },
  { key: "social_whatsapp", label: "WhatsApp" },
  { key: "social_website", label: "Sitio web" },
] as const;

export const emailTemplateFormSchema = z.object({
  layout: z.enum(["classic", "compact", "minimal"]),
  logo_url: optionalUrl,
  accent_color: hexColor,
  background_color: hexColor,
  text_color: hexColor,
  sender_name: optionalMax(80, "El nombre es demasiado largo"),
  sender_email: optionalEmail,
  header_title: optionalMax(140, "El título es demasiado largo"),
  header_subtitle: optionalMax(200, "El subtítulo es demasiado largo"),
  footer_text: optionalMax(300, "El pie de correo es demasiado largo"),
  button_label: optionalMax(40, "La etiqueta del botón es demasiado larga"),
  show_logo: checkboxField,
  show_details: checkboxField,
  social_instagram: optionalUrl,
  social_facebook: optionalUrl,
  social_whatsapp: optionalUrl,
  social_website: optionalUrl,
});

export type EmailTemplateFormInput = z.infer<typeof emailTemplateFormSchema>;

export function parseEmailTemplateForm(formData: FormData) {
  return emailTemplateFormSchema.safeParse(formDataObject(formData));
}

export function socialsFromValues(
  values: Pick<
    EmailTemplateFormInput,
    "social_instagram" | "social_facebook" | "social_whatsapp" | "social_website"
  >,
): EmailSocial[] {
  return SOCIAL_FIELDS.flatMap(({ key, label }) => {
    const url = values[key];
    return url ? [{ label, url }] : [];
  });
}

export const sendEmailFormSchema = z.object({
  to: z.email("Ingresa un correo válido"),
  subject: z
    .string()
    .trim()
    .min(3, "Escribe un asunto")
    .max(140, "El asunto es demasiado largo"),
  heading: optionalMax(140, "El título es demasiado largo"),
  message: z
    .string()
    .trim()
    .min(10, "Escribe un mensaje de al menos 10 caracteres")
    .max(4000, "El mensaje es demasiado largo"),
  cta_label: optionalMax(40, "La etiqueta del botón es demasiado larga"),
  cta_url: optionalUrl,
});

export type SendEmailFormInput = z.infer<typeof sendEmailFormSchema>;

export function parseSendEmailForm(formData: FormData) {
  return sendEmailFormSchema.safeParse(formDataObject(formData));
}

export const emailPreviewSchema = z.object({
  config: z.object({
    layout: z.enum(["classic", "compact", "minimal"]),
    logoUrl: z.union([z.null(), z.url()]),
    accentColor: hexColor,
    backgroundColor: hexColor,
    textColor: hexColor,
    senderName: z.string().max(80).nullable(),
    senderEmail: z.union([z.null(), z.email()]),
    headerTitle: z.string().max(140).nullable(),
    headerSubtitle: z.string().max(200).nullable(),
    footerText: z.string().max(300).nullable(),
    buttonLabel: z.string().max(40).nullable(),
    showLogo: z.boolean(),
    showDetails: z.boolean(),
    socials: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(40),
          url: z.url(),
        }),
      )
      .max(8),
  }),
  content: z.object({
    heading: z.string().trim().max(140),
    intro: z.string().trim().max(4000).optional(),
    ctaUrl: z.union([z.null(), z.url()]).optional(),
    ctaLabel: z.string().trim().max(40).optional(),
  }),
});

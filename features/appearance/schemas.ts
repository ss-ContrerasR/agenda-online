import { z } from "zod";
import { checkboxField, formDataObject, hexColor, optionalText } from "@/lib/form";

export const appearanceSchema = z.object({
  logo_url: optionalText,
  cover_url: optionalText,
  brand_primary: hexColor,
  brand_secondary: hexColor,
  brand_accent: hexColor,
  theme_preset: z.string().trim().min(1).max(40),
  dark_mode_enabled: checkboxField,
  public_theme: z.enum(["light", "dark", "system"]),
  public_hero_url: optionalText,
  public_about: z
    .string()
    .trim()
    .max(2000, "La descripción es demasiado larga")
    .optional()
    .transform((value) => (value ? value : null)),
  instagram: optionalText,
  facebook: optionalText,
  whatsapp: optionalText,
  seo_title: z
    .string()
    .trim()
    .max(120, "El título SEO es demasiado largo")
    .optional()
    .transform((value) => (value ? value : null)),
  seo_description: z
    .string()
    .trim()
    .max(300, "La descripción SEO es demasiado larga")
    .optional()
    .transform((value) => (value ? value : null)),
});

export type AppearanceInput = z.infer<typeof appearanceSchema>;

export function parseAppearanceForm(formData: FormData) {
  return formDataObject(formData);
}

/** Extrae de forma segura las redes sociales guardadas en `socials` (Json). */
export function socialValue(socials: unknown, key: string): string {
  if (!socials || typeof socials !== "object" || Array.isArray(socials)) {
    return "";
  }
  const value = (socials as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

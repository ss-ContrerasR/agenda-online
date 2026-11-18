import type { EmailLayout, EmailTemplateRow, Json } from "@/types/database";

/**
 * Configuración de la plantilla de correo. Este módulo es seguro para el
 * cliente (no importa React Email ni APIs de servidor) y se comparte entre el
 * editor visual, las acciones y el renderizador del servidor.
 */

export type EmailSocial = {
  label: string;
  url: string;
};

export type EmailTemplateConfig = {
  layout: EmailLayout;
  logoUrl: string | null;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  senderName: string | null;
  senderEmail: string | null;
  headerTitle: string | null;
  headerSubtitle: string | null;
  footerText: string | null;
  buttonLabel: string | null;
  showLogo: boolean;
  showDetails: boolean;
  socials: EmailSocial[];
};

export const EMAIL_LAYOUTS: Array<{
  id: EmailLayout;
  label: string;
  description: string;
}> = [
  {
    id: "classic",
    label: "Clásico",
    description: "Logo centrado, tarjeta con detalles y botón destacado.",
  },
  {
    id: "compact",
    label: "Compacto",
    description: "Encabezado en una línea y bloques más ajustados.",
  },
  {
    id: "minimal",
    label: "Minimalista",
    description: "Sin tarjeta ni botón: solo texto limpio y enlaces.",
  },
];

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateConfig = {
  layout: "classic",
  logoUrl: null,
  accentColor: "#0F766E",
  backgroundColor: "#F1F5F9",
  textColor: "#0F172A",
  senderName: null,
  senderEmail: null,
  headerTitle: null,
  headerSubtitle: null,
  footerText: null,
  buttonLabel: "Ver mi cita",
  showLogo: true,
  showDetails: true,
  socials: [],
};

/** Etiqueta legible del diseño elegido. */
export function emailLayoutLabel(layout: EmailLayout) {
  return EMAIL_LAYOUTS.find((item) => item.id === layout)?.label ?? "Clásico";
}

/**
 * `socials` se guarda como jsonb. Cualquier valor inesperado se descarta para
 * que la plantilla nunca falle por datos antiguos o corruptos.
 */
export function parseEmailSocials(value: Json | null | undefined): EmailSocial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!label || !url) return [];
    return [{ label: label.slice(0, 40), url: url.slice(0, 300) }];
  });
}

export function serializeEmailSocials(socials: EmailSocial[]): Json {
  return socials.map((social) => ({
    label: social.label.trim(),
    url: social.url.trim(),
  }));
}

export function toEmailTemplateConfig(
  row: Partial<EmailTemplateRow> | null | undefined,
): EmailTemplateConfig {
  if (!row) return { ...DEFAULT_EMAIL_TEMPLATE };
  return {
    layout: row.layout ?? DEFAULT_EMAIL_TEMPLATE.layout,
    logoUrl: row.logo_url ?? null,
    accentColor: row.accent_color ?? DEFAULT_EMAIL_TEMPLATE.accentColor,
    backgroundColor:
      row.background_color ?? DEFAULT_EMAIL_TEMPLATE.backgroundColor,
    textColor: row.text_color ?? DEFAULT_EMAIL_TEMPLATE.textColor,
    senderName: row.sender_name ?? null,
    senderEmail: row.sender_email ?? null,
    headerTitle: row.header_title ?? null,
    headerSubtitle: row.header_subtitle ?? null,
    footerText: row.footer_text ?? null,
    buttonLabel: row.button_label ?? DEFAULT_EMAIL_TEMPLATE.buttonLabel,
    showLogo: row.show_logo ?? true,
    showDetails: row.show_details ?? true,
    socials: parseEmailSocials(row.socials),
  };
}

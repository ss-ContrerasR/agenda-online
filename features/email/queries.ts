import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { loadEmailTemplate } from "@/lib/email/load";
import { renderEmailHtml } from "@/lib/notifications/email-template";
import type { EmailTemplateConfig } from "@/lib/email/config";
import type { OrganizationRow } from "@/types/database";

export type EmailStudioData = {
  template: EmailTemplateConfig;
  previewHtml: string;
  previewCtaUrl: string;
};

export async function getEmailStudioData(
  organization: Pick<OrganizationRow, "id" | "name" | "email" | "slug">,
  fallbackAccent: string,
): Promise<EmailStudioData> {
  const supabase = await createSupabaseServerClient();
  const template = await loadEmailTemplate(supabase, organization, {
    fallbackAccent,
  });
  const previewCtaUrl = `${publicEnv.appUrl}/reservar/${organization.slug}`;

  const { html } = await renderEmailHtml({
    config: template,
    businessName: organization.name,
    content: {
      previewText: "Así se verán tus correos",
      heading: "Tu próxima cita",
      intro:
        "Este es un ejemplo de cómo llegarán tus correos. Personaliza el diseño y guárdalo para aplicarlo a todos los envíos.",
      rows: [
        { label: "Servicio", value: "Corte y peinado" },
        { label: "Profesional", value: "Valeria Ríos" },
        { label: "Fecha", value: "Viernes 21 de noviembre" },
        { label: "Hora", value: "10:30 a. m." },
      ],
      ctaUrl: previewCtaUrl,
      ctaLabel: template.buttonLabel,
      footer:
        template.footerText ??
        `Este es un ejemplo de la vista previa de ${organization.name}.`,
    },
  });

  return { template, previewHtml: html, previewCtaUrl };
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { auditAction } from "@/lib/action-audit";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import { serializeEmailSocials } from "@/lib/email/config";
import { fetchOwnerEmail, loadEmailTemplate } from "@/lib/email/load";
import { sendEmail } from "@/lib/notifications/email";
import { renderEmailHtml } from "@/lib/notifications/email-template";
import {
  emailPreviewSchema,
  parseEmailTemplateForm,
  parseSendEmailForm,
  socialsFromValues,
} from "./schemas";

export type EmailPreviewResult = {
  ok: boolean;
  error?: string;
  html?: string;
};

function revalidateEmailStudio() {
  revalidatePath("/dashboard/correos");
  revalidatePath("/dashboard");
}

export async function saveEmailTemplateAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseEmailTemplateForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la plantilla.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("email:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const data = parsed.data;

    // El remitente pertenece al propietario: solo él puede cambiarlo. Los demás
    // roles conservan la dirección ya configurada (o la del propietario actual).
    let senderEmail = data.sender_email;
    if (session.membership.role !== "owner") {
      const { data: existing } = await supabase
        .from("email_templates")
        .select("sender_email")
        .eq("organization_id", organizationId)
        .maybeSingle();
      senderEmail =
        existing?.sender_email ??
        (await fetchOwnerEmail(supabase, organizationId)) ??
        session.organization.email;
    }

    const { error } = await supabase.from("email_templates").upsert(
      {
        organization_id: organizationId,
        layout: data.layout,
        logo_url: data.logo_url,
        accent_color: data.accent_color,
        background_color: data.background_color,
        text_color: data.text_color,
        sender_name: data.sender_name,
        sender_email: senderEmail,
        header_title: data.header_title,
        header_subtitle: data.header_subtitle,
        footer_text: data.footer_text,
        button_label: data.button_label,
        show_logo: data.show_logo,
        show_details: data.show_details,
        socials: serializeEmailSocials(socialsFromValues(data)),
      },
      { onConflict: "organization_id" },
    );
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "email_template.updated",
      entity: "email_templates",
      entityId: organizationId,
      metadata: {
        layout: data.layout,
        sender_email: senderEmail,
      },
    });

    revalidateEmailStudio();
    return { ok: true, message: "Plantilla de correo guardada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function renderEmailPreviewAction(
  input: unknown,
): Promise<EmailPreviewResult> {
  const parsed = emailPreviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "La vista previa recibió datos inválidos." };
  }

  try {
    const session = await requirePermission("email:read");
    const { html } = await renderEmailHtml({
      config: parsed.data.config,
      businessName: session.organization.name,
      content: {
        previewText: parsed.data.content.heading,
        heading: parsed.data.content.heading,
        intro: parsed.data.content.intro,
        rows: [
          { label: "Servicio", value: "Corte y peinado" },
          { label: "Profesional", value: "Valeria Ríos" },
          { label: "Fecha", value: "Viernes 21 de noviembre" },
          { label: "Hora", value: "10:30 a. m." },
        ],
        ctaUrl: parsed.data.content.ctaUrl,
        ctaLabel: parsed.data.content.ctaLabel,
        footer:
          parsed.data.config.footerText ??
          `Este es un ejemplo de la vista previa de ${session.organization.name}.`,
      },
      includePlainText: false,
    });
    return { ok: true, html };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function sendCustomEmailAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseSendEmailForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del correo.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("email:send");
    const supabase = await createSupabaseServerClient();
    const template = await loadEmailTemplate(supabase, session.organization, {
      fallbackAccent: session.settings.brand_primary,
    });
    const { to, subject, message, cta_label, cta_url } = parsed.data;
    const heading = parsed.data.heading ?? subject;

    const { html, text } = await renderEmailHtml({
      config: template,
      businessName: session.organization.name,
      content: {
        previewText: subject,
        heading,
        intro: message,
        ctaUrl: cta_url,
        ctaLabel: cta_label ?? template.buttonLabel,
        footer: template.footerText,
      },
    });

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      sender: {
        name: template.senderName,
        email: template.senderEmail,
      },
    });

    // La tabla `notifications` no permite insert desde el cliente: se usa el
    // cliente service-role solo para dejar registro del envío manual.
    if (isAdminClientConfigured()) {
      try {
        await createSupabaseAdminClient()
          .from("notifications")
          .insert({
            organization_id: session.membership.organization_id,
            user_id: session.user.id,
            appointment_id: null,
            type: "custom_email",
            channel: "email",
            recipient: to,
            title: subject,
            body: message.slice(0, 500),
            status: result.status,
            provider_id: result.providerId ?? null,
            error: result.error ?? null,
            metadata: {
              source: "email_studio",
              heading,
              sender_email: template.senderEmail,
            },
            sent_at: result.status === "sent" ? new Date().toISOString() : null,
          });
      } catch (logError) {
        console.error("No se pudo registrar el correo enviado", logError);
      }
    }

    if (result.status === "sent") {
      await auditAction({
        organizationId: session.membership.organization_id,
        userId: session.user.id,
        action: "email.sent",
        entity: "notifications",
        metadata: { to, subject },
      });
      revalidateEmailStudio();
      return { ok: true, message: `Correo enviado a ${to}.` };
    }

    return {
      ok: false,
      error:
        result.status === "skipped"
          ? "El envío de correos no está configurado. Define RESEND_API_KEY en el servidor."
          : `No se pudo enviar el correo: ${result.error ?? "error desconocido"}`,
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

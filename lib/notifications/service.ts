import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { formatDateInTz, formatTimeInTz } from "@/lib/utils";
import { publicEnv } from "@/lib/env";
import { sendEmail } from "@/lib/notifications/email";
import { renderEmailHtml } from "@/lib/notifications/email-template";
import { loadEmailTemplate } from "@/lib/email/load";
import type { NotificationEvent } from "@/lib/notifications/templates";

export type NotifyAppointmentInput = {
  event: NotificationEvent;
  organization: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    timezone: string;
    currency: string;
  };
  settings: { email_notifications: boolean; brand_primary: string } | null;
  appointment: {
    id: string;
    public_token: string;
    starts_at: string;
    status: string;
  };
  serviceName: string;
  employeeName: string;
  employeeUserId: string | null;
  client: {
    name: string;
    email: string | null;
    phone: string;
  };
  reason?: string | null;
};

const EVENT_COPY: Record<
  NotificationEvent,
  { title: string; clientTitle: string; intro: string }
> = {
  created: {
    title: "Nueva reserva recibida",
    clientTitle: "Recibimos tu reserva",
    intro: "Tu solicitud quedó registrada. El negocio confirmará los detalles.",
  },
  confirmed: {
    title: "Cita confirmada",
    clientTitle: "Tu cita está confirmada",
    intro: "¡Todo listo! Te esperamos en la fecha indicada.",
  },
  cancelled: {
    title: "Cita cancelada",
    clientTitle: "Tu cita fue cancelada",
    intro: "La cita fue cancelada. Si tienes dudas, contacta al negocio.",
  },
  rescheduled: {
    title: "Cita reprogramada",
    clientTitle: "Tu cita cambió de horario",
    intro: "Estos son los nuevos detalles de tu cita.",
  },
  reminder: {
    title: "Recordatorio de cita",
    clientTitle: "Recordatorio de tu cita",
    intro: "Te recordamos tu próxima cita. Si no puedes asistir, avísanos.",
  },
};

/**
 * Registra la notificación en base de datos y, si el correo está configurado,
 * la envía. Un fallo de correo nunca debe revertir la reserva.
 */
export async function notifyAppointmentEvent(
  admin: SupabaseClient<Database>,
  input: NotifyAppointmentInput,
) {
  const copy = EVENT_COPY[input.event];
  const dateLabel = formatDateInTz(
    input.appointment.starts_at,
    input.organization.timezone,
    "EEEE d 'de' MMMM",
  );
  const timeLabel = formatTimeInTz(
    input.appointment.starts_at,
    input.organization.timezone,
  );

  const rows = [
    { label: "Servicio", value: input.serviceName },
    { label: "Profesional", value: input.employeeName },
    { label: "Fecha", value: dateLabel },
    { label: "Hora", value: timeLabel },
    { label: "Cliente", value: input.client.name },
  ];
  if (input.reason) rows.push({ label: "Motivo", value: input.reason });

  const recipients: Array<{
    email: string | null;
    title: string;
    intro: string;
    type: string;
    userId: string | null;
  }> = [
    {
      email: input.organization.email,
      title: copy.title,
      intro: `${input.client.name} · ${input.serviceName} · ${dateLabel} ${timeLabel}`,
      type: `appointment_${input.event}`,
      userId: null,
    },
    {
      email: input.client.email,
      title: copy.clientTitle,
      intro: copy.intro,
      type: `client_appointment_${input.event}`,
      userId: null,
    },
  ];

  const inAppMetadata = {
    event: input.event,
    service: input.serviceName,
    employee: input.employeeName,
    employee_user_id: input.employeeUserId,
    starts_at: input.appointment.starts_at,
    public_token: input.appointment.public_token,
    href: `/dashboard/citas/${input.appointment.id}?highlight=${input.appointment.id}`,
    highlight: input.appointment.id,
  };

  const emailTemplate = await loadEmailTemplate(admin, input.organization, {
    fallbackAccent: input.settings?.brand_primary,
  });
  const appointmentUrl = `${publicEnv.appUrl}/reservar/${input.organization.slug}/cita/${input.appointment.public_token}`;

  for (const recipient of recipients) {
    const baseRow = {
      organization_id: input.organization.id,
      user_id: recipient.userId,
      appointment_id: input.appointment.id,
      type: recipient.type,
      channel: "email" as const,
      recipient: recipient.email,
      title: recipient.title,
      body: recipient.intro,
      metadata: {
        event: input.event,
        service: input.serviceName,
        employee: input.employeeName,
        starts_at: input.appointment.starts_at,
        public_token: input.appointment.public_token,
      },
    };

    if (!input.settings?.email_notifications || !recipient.email) {
      await admin.from("notifications").insert({
        ...baseRow,
        status: "skipped",
        error: !recipient.email
          ? "Sin correo del destinatario"
          : "Notificaciones por correo desactivadas",
      });
      continue;
    }

    const { html, text } = await renderEmailHtml({
      config: emailTemplate,
      businessName: input.organization.name,
      content: {
        previewText: `${recipient.title} · ${input.organization.name}`,
        heading: recipient.title,
        intro: recipient.intro,
        rows,
        ctaUrl: appointmentUrl,
        ctaLabel: emailTemplate.buttonLabel,
        footer:
          emailTemplate.footerText ??
          `Gestiona tu cita en ${publicEnv.appUrl}`,
      },
    });

    const result = await sendEmail({
      to: recipient.email,
      subject: `${recipient.title} · ${input.organization.name}`,
      html,
      text,
      sender: {
        name: emailTemplate.senderName,
        email: emailTemplate.senderEmail,
      },
    });

    await admin.from("notifications").insert({
      ...baseRow,
      status: result.status,
      provider_id: result.providerId ?? null,
      error: result.error ?? null,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    });
  }

  // Aviso interno para el panel. Se guarda aparte del correo para que la
  // bandeja pueda mostrarlo, resaltar la cita y avisar en tiempo real sin
  // depender de que el correo esté configurado.
  await admin.from("notifications").insert({
    organization_id: input.organization.id,
    user_id: null,
    appointment_id: input.appointment.id,
    type: `appointment_${input.event}`,
    channel: "in_app",
    recipient: null,
    title: copy.title,
    body: rows
      .map((row) => `${row.label}: ${row.value}`)
      .join(" · "),
    status: "sent",
    metadata: inAppMetadata,
    sent_at: new Date().toISOString(),
  });
}

import "server-only";

import { Resend } from "resend";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export type EmailSender = {
  name?: string | null;
  email?: string | null;
};

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Correo del propietario que debe figurar como remitente/respuesta. */
  sender?: EmailSender | null;
};

export type EmailResult = {
  status: "sent" | "skipped" | "failed";
  providerId?: string;
  error?: string;
};

const PLATFORM_FROM =
  process.env.RESEND_FROM_EMAIL ?? "AgendaTEX <onboarding@resend.dev>";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function extractEmail(value: string): string | null {
  const match = value.match(/<([^<>]+)>/);
  const candidate = (match ? match[1] : value).trim();
  return EMAIL_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

function formatAddress(name: string | null | undefined, email: string): string {
  const clean = name?.trim().replace(/["<>]/g, "");
  return clean ? `"${clean}" <${email}>` : email;
}

/**
 * Resend solo permite enviar desde un dominio verificado. Si el correo del
 * dueño comparte el dominio del remitente de la plataforma, se usa como `from`.
 * En caso contrario se usa el remitente de plataforma y el correo del dueño
 * como `reply_to`, que es el comportamiento correcto y explicable al usuario.
 */
export function resolveEmailSender(sender: EmailSender | null | undefined) {
  const platformEmail = extractEmail(PLATFORM_FROM);
  const ownerEmail =
    sender?.email && EMAIL_PATTERN.test(sender.email.trim())
      ? sender.email.trim().toLowerCase()
      : null;

  if (!ownerEmail) {
    return {
      from: PLATFORM_FROM,
      replyTo: undefined,
      usesOwnerAddress: false,
      ownerEmail: null,
    };
  }

  if (platformEmail && domainOf(ownerEmail) === domainOf(platformEmail)) {
    return {
      from: formatAddress(sender?.name, ownerEmail),
      replyTo: ownerEmail,
      usesOwnerAddress: true,
      ownerEmail,
    };
  }

  return {
    from: PLATFORM_FROM,
    replyTo: ownerEmail,
    usesOwnerAddress: false,
    ownerEmail,
  };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      status: "skipped",
      error: "RESEND_API_KEY no está configurada.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { from, replyTo } = resolveEmailSender(payload.sender);
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      return { status: "failed", error: error.message };
    }

    return { status: "sent", providerId: data?.id };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Error de envío",
    };
  }
}

import "server-only";

import { Resend } from "resend";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailResult = {
  status: "sent" | "skipped" | "failed";
  providerId?: string;
  error?: string;
};

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
    const from =
      process.env.RESEND_FROM_EMAIL ?? "AgendaPro <onboarding@resend.dev>";
    const { data, error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
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

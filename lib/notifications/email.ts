import "server-only";

import { Resend } from "resend";

export type EmailProviderId = "brevo" | "resend";

export type EmailProviderInfo = {
  id: EmailProviderId;
  label: string;
};

type EmailProvider = EmailProviderInfo & {
  apiKey: string;
  from: string;
};

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

const RESEND_DEFAULT_FROM = "AgendaTEX <onboarding@resend.dev>";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

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

function parseAddress(value: string) {
  const email = extractEmail(value) ?? value.trim();
  const match = value.match(/^\s*"?([^"<>]*)"?\s*</);
  const name = match?.[1]?.trim() || null;
  return { email, name };
}

/**
 * Brevo es la opción recomendada cuando no se tiene dominio propio: permite
 * verificar un correo individual y enviar a cualquier destinatario con un plan
 * gratuito. Si no está configurado, se mantiene Resend como alternativa.
 */
function getProvider(): EmailProvider | null {
  const brevoKey = readEnv("BREVO_API_KEY");
  const brevoFrom = readEnv("BREVO_FROM_EMAIL");
  if (brevoKey && brevoFrom && extractEmail(brevoFrom)) {
    return {
      id: "brevo",
      label: "Brevo",
      apiKey: brevoKey,
      from: brevoFrom,
    };
  }

  const resendKey = readEnv("RESEND_API_KEY");
  if (resendKey) {
    return {
      id: "resend",
      label: "Resend",
      apiKey: resendKey,
      from: readEnv("RESEND_FROM_EMAIL") ?? RESEND_DEFAULT_FROM,
    };
  }

  return null;
}

export function isEmailConfigured() {
  return getProvider() !== null;
}

/** Proveedor activo para mostrarlo en la UI sin exponer credenciales. */
export function getEmailProviderInfo(): EmailProviderInfo | null {
  const provider = getProvider();
  return provider ? { id: provider.id, label: provider.label } : null;
}

/**
 * Brevo y Resend solo permiten enviar desde un remitente verificado. Si el
 * correo del propietario puede usarse como `from` (coincide con el remitente en
 * Brevo o comparte el dominio verificado en Resend), se usa directamente. En
 * caso contrario se envía desde el remitente de plataforma y el correo del
 * propietario se usa como `reply_to`, que es el comportamiento correcto y
 * explicable al usuario.
 */
export function resolveEmailSender(sender: EmailSender | null | undefined) {
  const provider = getProvider();
  const platform = parseAddress(provider?.from ?? RESEND_DEFAULT_FROM);
  const ownerEmail =
    sender?.email && EMAIL_PATTERN.test(sender.email.trim())
      ? sender.email.trim().toLowerCase()
      : null;

  if (!ownerEmail) {
    return {
      from: formatAddress(platform.name, platform.email),
      fromName: platform.name,
      fromEmail: platform.email,
      replyTo: undefined,
      usesOwnerAddress: false,
      ownerEmail: null,
    };
  }

  // Brevo verifica remitentes individuales: solo el correo exacto puede usarse
  // como `from`. Resend verifica dominios completos, así que basta el dominio.
  const sameDomain = Boolean(
    platform.email && domainOf(ownerEmail) === domainOf(platform.email),
  );
  const canUseOwnerAsFrom =
    ownerEmail === platform.email || (provider?.id !== "brevo" && sameDomain);

  if (canUseOwnerAsFrom) {
    const fromName = sender?.name?.trim() || platform.name;
    return {
      from: formatAddress(fromName, ownerEmail),
      fromName,
      fromEmail: ownerEmail,
      replyTo: ownerEmail,
      usesOwnerAddress: true,
      ownerEmail,
    };
  }

  return {
    from: formatAddress(platform.name, platform.email),
    fromName: platform.name,
    fromEmail: platform.email,
    replyTo: ownerEmail,
    usesOwnerAddress: false,
    ownerEmail,
  };
}

type ResolvedSender = ReturnType<typeof resolveEmailSender>;

function brevoErrorMessage(
  message: string | undefined,
  status: number,
): string {
  const normalized = message?.toLowerCase() ?? "";
  const isIpBlocked =
    normalized.includes("unrecognised ip") ||
    normalized.includes("unauthorized ip") ||
    normalized.includes("authorised_ips") ||
    normalized.includes("authorized_ips");

  if (isIpBlocked) {
    const ip = message?.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0];
    return [
      `Brevo bloqueó el envío porque la IP${ip ? ` ${ip}` : " del servidor"} no está autorizada.`,
      "Agrégala en https://app.brevo.com/security/authorised_ips o desactiva “Block unknown IP addresses”.",
      "En producción usa una IP de salida fija; si la IP cambia, vuelve a autorizarla.",
    ].join(" ");
  }

  return (
    message ??
    `Brevo respondió con el código ${status}. Revisa que el remitente esté verificado.`
  );
}

async function sendWithBrevo(
  provider: EmailProvider,
  payload: EmailPayload,
  sender: ResolvedSender,
): Promise<EmailResult> {
  const to = extractEmail(payload.to) ?? payload.to.trim();
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": provider.apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: sender.fromEmail,
        ...(sender.fromName ? { name: sender.fromName } : {}),
      },
      to: [{ email: to }],
      subject: payload.subject,
      htmlContent: payload.html,
      ...(payload.text ? { textContent: payload.text } : {}),
      ...(sender.replyTo ? { replyTo: { email: sender.replyTo } } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await response.json().catch(() => null)) as
    | { messageId?: string; message?: string; code?: string }
    | null;

  if (!response.ok) {
    return {
      status: "failed",
      error: brevoErrorMessage(data?.message, response.status),
    };
  }

  return { status: "sent", providerId: data?.messageId };
}

async function sendWithResend(
  provider: EmailProvider,
  payload: EmailPayload,
  sender: ResolvedSender,
): Promise<EmailResult> {
  const resend = new Resend(provider.apiKey);
  const { data, error } = await resend.emails.send({
    from: sender.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });

  if (error) {
    return { status: "failed", error: error.message };
  }

  return { status: "sent", providerId: data?.id };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const provider = getProvider();
  if (!provider) {
    return {
      status: "skipped",
      error:
        "El envío de correos no está configurado. Define BREVO_API_KEY y BREVO_FROM_EMAIL, o RESEND_API_KEY.",
    };
  }

  try {
    const sender = resolveEmailSender(payload.sender);
    return provider.id === "brevo"
      ? await sendWithBrevo(provider, payload, sender)
      : await sendWithResend(provider, payload, sender);
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Error de envío",
    };
  }
}

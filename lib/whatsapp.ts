/**
 * Número de ejemplo: reemplázalo en `.env.local` con tu WhatsApp real.
 * Se acepta con o sin código de país, espacios o signos "+" y "-".
 */
export const DEFAULT_WHATSAPP_NUMBER = "573203009633";

export function platformWhatsappNumber(): string {
  const configured =
    process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
  const digits = configured.replace(/\D/g, "");
  return digits || DEFAULT_WHATSAPP_NUMBER;
}

export function buildPaymentMessage(organizationName: string): string {
  return `Hola Sergio, soy el dueño de la empresa "${organizationName}" y me gustaría realizar el pago.`;
}

export function buildWhatsAppUrl(input: {
  phone: string;
  message: string;
  mobile: boolean;
}): string {
  const phone = input.phone.replace(/\D/g, "");
  const text = encodeURIComponent(input.message);
  return input.mobile
    ? `https://wa.me/${phone}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
}

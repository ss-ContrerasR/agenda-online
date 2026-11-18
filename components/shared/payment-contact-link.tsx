"use client";

import { useSyncExternalStore } from "react";
import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  buildPaymentMessage,
  buildWhatsAppUrl,
  platformWhatsappNumber,
} from "@/lib/whatsapp";

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile/i;

function subscribeToUserAgent() {
  return () => {};
}

function getMobileSnapshot() {
  return typeof navigator !== "undefined" && MOBILE_USER_AGENT.test(navigator.userAgent);
}

function getServerMobileSnapshot() {
  return false;
}

/**
 * En escritorio abre WhatsApp Web y en móvil la aplicación nativa.
 * `useSyncExternalStore` mantiene el HTML prerenderizado determinista (escritorio)
 * y aplica el detector del navegador justo después de hidratar, sin efectos que
 * provoquen renderizados adicionales.
 */
export function PaymentContactLink({
  organizationName,
  label = "Contactar por WhatsApp",
  variant = "default",
  size = "sm",
  className,
}: {
  organizationName: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const mobile = useSyncExternalStore(
    subscribeToUserAgent,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );

  const href = buildWhatsAppUrl({
    phone: platformWhatsappNumber(),
    message: buildPaymentMessage(organizationName),
    mobile,
  });

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" />
        {label}
      </a>
    </Button>
  );
}

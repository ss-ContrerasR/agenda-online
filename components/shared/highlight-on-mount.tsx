"use client";

import { useEffect } from "react";

/**
 * Resalta durante 3 segundos el elemento con `data-highlight-id` indicado.
 * AgendaTEX usa este componente al abrir una notificación para que la cita
 * relacionada sea fácil de ubicar.
 */
export function HighlightOnMount({ id }: { id: string | null }) {
  useEffect(() => {
    if (!id) return;

    const target = document.querySelector<HTMLElement>(
      `[data-highlight-id="${CSS.escape(id)}"]`,
    );
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    // Reinicia la animación por si el mismo elemento ya estaba resaltado.
    target.classList.remove("notification-highlight");
    void target.offsetWidth;
    target.classList.add("notification-highlight");

    const timer = window.setTimeout(() => {
      target.classList.remove("notification-highlight");
      const url = new URL(window.location.href);
      url.searchParams.delete("highlight");
      window.history.replaceState({}, "", url);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [id]);

  return null;
}

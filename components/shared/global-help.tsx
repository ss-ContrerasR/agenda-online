"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// El tour flotante no debe entrar en el bundle del panel, donde ya existe el
// tour de la barra superior. Al cargarlo de forma diferida solo se descarga en
// las páginas públicas y de autenticación.
const GuidedTour = dynamic(
  () =>
    import("@/components/shared/guided-tour").then(
      (module) => module.GuidedTour,
    ),
  { ssr: false },
);

/**
 * Tour flotante para páginas públicas y de autenticación. Dentro de /dashboard y
 * /admin el tour ya vive en la barra superior, así que se oculta para no duplicarlo.
 */
export function GlobalHelp() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return null;
  }
  return <GuidedTour variant="site" floating />;
}

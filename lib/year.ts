import { cacheLife } from "next/cache";

/**
 * Año actual para pies de página. Se cachea para poder usarse en
 * componentes prerenderizados sin disparar la validación de `cacheComponents`.
 */
export async function getCurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

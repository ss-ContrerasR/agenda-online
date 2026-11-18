import "server-only";

import { connection } from "next/server";

/**
 * Obtiene la hora actual fuera del cuerpo de render. `connection()` garantiza
 * que la lectura ocurra por petición y el valor no se prerenderice.
 */
export async function getCurrentTimestamp(): Promise<number> {
  await connection();
  return Date.now();
}

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

/**
 * Cliente con service role. Omite RLS, por lo que SOLO debe usarse en el
 * servidor para operaciones públicas controladas (reservas) y tareas internas.
 * Nunca lo importes desde un Client Component.
 */
let adminClient: SupabaseClient<Database> | undefined;

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicEnv.supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Configúrala en el servidor para habilitar reservas públicas.",
    );
  }
  if (!adminClient) {
    adminClient = createClient<Database>(
      publicEnv.supabaseUrl,
      serviceRoleKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return adminClient;
}

export function isAdminClientConfigured() {
  return Boolean(publicEnv.supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

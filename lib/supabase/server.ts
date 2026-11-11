import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { requireSupabaseEnv } from "@/lib/env";

/**
 * Cliente con la sesión del usuario (respeta RLS). Úsalo en Server Components,
 * Server Actions y Route Handlers del panel administrativo.
 */
export async function createSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // En Server Components Next.js no permite escribir cookies.
          // El refresco de sesión lo realiza proxy.ts.
        }
      },
    },
  });
}

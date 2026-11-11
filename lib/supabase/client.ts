"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error("Supabase no está configurado.");
  }
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      publicEnv.supabaseUrl,
      publicEnv.supabaseAnonKey,
    );
  }
  return browserClient;
}

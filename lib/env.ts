export const APP_NAME = "AgendaPro";
export const DEMO_ORG_SLUG = "estudio-aurora";

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
} as const;

export const isSupabaseConfigured =
  publicEnv.supabaseUrl.startsWith("http") &&
  publicEnv.supabaseAnonKey.length > 20;

export function requireSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return publicEnv;
}

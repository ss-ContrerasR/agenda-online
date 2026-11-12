import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

export async function logAudit(
  supabase: SupabaseClient<Database>,
  input: {
    organizationId: string;
    userId: string | null;
    action: string;
    entity?: string;
    entityId?: string | null;
    metadata?: Json;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("No se pudo registrar la auditoría", error);
}

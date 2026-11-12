import "server-only";

import type { Json } from "@/types/database";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

/**
 * Registra una acción administrativa sin exponer el cliente service-role.
 * Si no está configurado, la operación continúa (la auditoría no es crítica).
 */
export async function auditAction(input: {
  organizationId: string;
  userId: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  metadata?: Json;
}) {
  if (!isAdminClientConfigured()) return;
  await logAudit(createSupabaseAdminClient(), input);
}

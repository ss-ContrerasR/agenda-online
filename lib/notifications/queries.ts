import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { mapNotificationRow, type NotificationItem } from "./view";

/**
 * Devuelve solo los avisos internos de la bandeja. Los registros de correo siguen
 * existiendo para auditoría, pero no deben aparecer como notificaciones del panel.
 *
 * `employeeUserId` acota la bandeja al profesional asignado: RLS ya lo protege,
 * pero el filtro evita que un empleado reciba por Realtime avisos de compañeros.
 */
export async function fetchInAppNotifications(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  limit = 20,
  employeeUserId?: string | null,
): Promise<NotificationItem[]> {
  let query = supabase
    .from("notifications")
    .select(
      "id, title, body, created_at, status, type, metadata, read_at, channel",
    )
    .eq("organization_id", organizationId)
    .eq("channel", "in_app")
    .is("deleted_at", null)
    .not("type", "like", "client_%");

  if (employeeUserId) {
    query = query.contains("metadata", { employee_user_id: employeeUserId });
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapNotificationRow);
}

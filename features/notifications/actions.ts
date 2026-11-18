"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError, getActionError, type ActionResult } from "@/lib/errors";
import { fetchInAppNotifications } from "@/lib/notifications/queries";
import type { NotificationItem } from "@/lib/notifications/view";

function revalidateNotificationViews() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/notificaciones");
}

async function scopedUpdate(notificationId: string) {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: notification } = await supabase
    .from("notifications")
    .select("id, organization_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (!notification || notification.organization_id !== session.membership.organization_id) {
    throw new AppError("FORBIDDEN", "No tienes permisos sobre esta notificación.");
  }

  return supabase;
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const supabase = await scopedUpdate(notificationId);
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) throw error;
    revalidateNotificationViews();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", session.membership.organization_id)
      .eq("channel", "in_app")
      .is("deleted_at", null)
      .is("read_at", null);

    if (session.membership.role === "employee") {
      query = query.contains("metadata", { employee_user_id: session.user.id });
    }

    const { error } = await query;
    if (error) throw error;
    revalidateNotificationViews();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteNotificationAction(
  notificationId: string,
): Promise<ActionResult> {
  try {
    const supabase = await scopedUpdate(notificationId);
    const { error } = await supabase
      .from("notifications")
      .update({
        deleted_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId);

    if (error) throw error;
    revalidateNotificationViews();
    return { ok: true, message: "Notificación eliminada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function listInAppNotificationsAction(
  limit = 20,
): Promise<NotificationItem[]> {
  try {
    const session = await requireSession();
    const supabase = await createSupabaseServerClient();
    return await fetchInAppNotifications(
      supabase,
      session.membership.organization_id,
      limit,
      session.membership.role === "employee" ? session.user.id : null,
    );
  } catch {
    return [];
  }
}

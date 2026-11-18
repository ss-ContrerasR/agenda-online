"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { NotificationToast } from "@/components/dashboard/notification-toast";
import {
  deleteNotificationAction,
  listInAppNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import {
  isNewAppointmentNotification,
  mapNotificationRow,
  type NotificationItem,
} from "@/lib/notifications/view";
import type { NotificationRow } from "@/types/database";

function byNewest(a: NotificationItem, b: NotificationItem) {
  return b.createdAt.localeCompare(a.createdAt);
}

export function useInAppNotifications({
  initialItems,
  organizationId,
  limit = 20,
  toastOnNew = true,
  restrictToUserId = null,
}: {
  initialItems: NotificationItem[];
  organizationId: string;
  limit?: number;
  toastOnNew?: boolean;
  /** Si se indica, solo se muestran avisos dirigidos a ese usuario (empleado). */
  restrictToUserId?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const itemsRef = useRef(initialItems);
  const knownIds = useRef(new Set(initialItems.map((item) => item.id)));
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const channelName = `notifications:${organizationId}:${instanceId}`;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const apply = useCallback((next: NotificationItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const announce = useCallback(
    (item: NotificationItem) => {
      if (!toastOnNew || knownIds.current.has(item.id)) return;
      knownIds.current.add(item.id);

      const isNew = isNewAppointmentNotification(item.type);
      const target = item.href ?? "/dashboard/notificaciones";
      toast.custom(
        (toastId) => (
          <NotificationToast
            title={item.title}
            description={
              item.body ?? (isNew ? "Se agendó una nueva cita." : null)
            }
            createdAt={item.createdAt}
            label={isNew ? "Nueva cita" : "Notificación"}
            actionLabel={isNew ? "Ver cita" : "Ver"}
            onAction={() => {
              toast.dismiss(toastId);
              router.push(target);
            }}
            onClose={() => toast.dismiss(toastId)}
          />
        ),
        { duration: 9000, unstyled: true },
      );
    },
    [router, toastOnNew],
  );

  const removeLocal = useCallback(
    (id: string) => {
      apply(itemsRef.current.filter((item) => item.id !== id));
      knownIds.current.delete(id);
    },
    [apply],
  );

  const upsertLocal = useCallback(
    (item: NotificationItem) => {
      const next = [item, ...itemsRef.current.filter((value) => value.id !== item.id)]
        .sort(byNewest)
        .slice(0, limit);
      apply(next);
    },
    [apply, limit],
  );

  const refresh = useCallback(async () => {
    const latest = await listInAppNotificationsAction(limit);
    latest.forEach((item) => knownIds.current.add(item.id));
    apply(latest);
  }, [apply, limit]);

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const row = payload.new as unknown as NotificationRow | null;
          if (!row || row.channel !== "in_app") return;
          if (typeof row.type === "string" && row.type.startsWith("client_")) return;

          if (restrictToUserId) {
            const metadata =
              row.metadata &&
              typeof row.metadata === "object" &&
              !Array.isArray(row.metadata)
                ? (row.metadata as Record<string, unknown>)
                : null;
            if (metadata?.employee_user_id !== restrictToUserId) return;
          }

          if (row.deleted_at) {
            removeLocal(row.id);
          } else {
            const item = mapNotificationRow(row);
            upsertLocal(item);
            announce(item);
          }
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    announce,
    channelName,
    organizationId,
    removeLocal,
    restrictToUserId,
    router,
    supabase,
    upsertLocal,
  ]);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      const latest = await listInAppNotificationsAction(limit);
      if (!active) return;
      latest.forEach(announce);
      apply(latest);
    };
    const timer = window.setInterval(() => void sync(), 20000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [announce, apply, limit]);

  const markRead = useCallback(
    async (id: string) => {
      apply(
        itemsRef.current.map((item) =>
          item.id === id
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
      const result = await markNotificationReadAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo marcar la notificación.");
        void refresh();
      }
    },
    [apply, refresh],
  );

  const markAllRead = useCallback(async () => {
    if (!itemsRef.current.some((item) => !item.readAt)) return;
    const now = new Date().toISOString();
    apply(
      itemsRef.current.map((item) =>
        item.readAt ? item : { ...item, readAt: now },
      ),
    );
    const result = await markAllNotificationsReadAction();
    if (!result.ok) {
      toast.error(result.error ?? "No se pudieron marcar las notificaciones.");
      void refresh();
    }
  }, [apply, refresh]);

  const remove = useCallback(
    async (id: string) => {
      removeLocal(id);
      const result = await deleteNotificationAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo eliminar la notificación.");
        void refresh();
        return;
      }
      toast.success(result.message ?? "Notificación eliminada.");
    },
    [refresh, removeLocal],
  );

  return {
    items,
    unreadCount: items.filter((item) => !item.readAt).length,
    markRead,
    markAllRead,
    remove,
    refresh,
  };
}

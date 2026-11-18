"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInAppNotifications } from "@/features/notifications/hooks/use-in-app-notifications";
import type { NotificationItem as InitialNotificationItem } from "@/lib/notifications/view";
import { cn, relativeTime } from "@/lib/utils";

export type NotificationItem = InitialNotificationItem;

export function NotificationsMenu({
  items,
  organizationId,
  restrictToUserId = null,
}: {
  items: NotificationItem[];
  organizationId: string;
  restrictToUserId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { items: notifications, unreadCount, markRead, markAllRead, remove } =
    useInAppNotifications({ initialItems: items, organizationId, restrictToUserId });

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (value) void markAllRead();
  }

  async function handleSelect(item: NotificationItem) {
    setOpen(false);
    await markRead(item.id);
    if (item.href) router.push(item.href);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("relative", unreadCount > 0 && "animate-pulse")}
          aria-label={
            unreadCount > 0
              ? `Notificaciones, ${unreadCount} sin revisar`
              : "Notificaciones"
          }
        >
          <Bell className={cn("size-4", unreadCount > 0 && "text-primary")} />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notificaciones</DropdownMenuLabel>
          <span className="text-[11px] text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} sin revisar`
              : `${notifications.length} recientes`}
          </span>
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Sin notificaciones por ahora.
          </div>
        ) : (
          notifications.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={(event) => event.preventDefault()}
              className="items-start py-0"
            >
              <div className="flex w-full items-start gap-1">
                {!item.readAt ? (
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSelect(item)}
                  className="min-w-0 flex-1 py-2 text-left outline-none"
                >
                  <span className="block text-sm font-medium">{item.title}</span>
                  {item.body ? (
                    <span className="line-clamp-2 text-xs font-normal text-muted-foreground">
                      {item.body}
                    </span>
                  ) : null}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {relativeTime(item.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void remove(item.id);
                  }}
                  aria-label={`Eliminar notificación: ${item.title}`}
                  className="mt-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notificaciones" className="justify-between">
            Ver todas
            {unreadCount > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                <CheckCheck className="size-3" /> {unreadCount} pendientes
              </span>
            ) : null}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

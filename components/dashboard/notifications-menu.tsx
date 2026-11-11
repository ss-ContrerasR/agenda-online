"use client";

import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { relativeTime } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  status: string;
};

export function NotificationsMenu({ items }: { items: NotificationItem[] }) {
  const unread = items.filter((item) => item.status !== "sent").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
          {items.length > 0 ? (
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
            {items.length} recientes
          </span>
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Sin notificaciones por ahora.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild className="items-start py-2">
              <Link href="/dashboard/notificaciones" className="flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{item.title}</span>
                {item.body ? (
                  <span className="line-clamp-2 text-xs font-normal text-muted-foreground">
                    {item.body}
                  </span>
                ) : null}
                <span className="text-[10px] font-normal text-muted-foreground">
                  {relativeTime(item.createdAt)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notificaciones" className="justify-between">
            Ver todas
            {unread > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                <CheckCheck className="size-3" /> {unread} pendientes
              </span>
            ) : null}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

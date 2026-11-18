"use client";

import { useRouter } from "next/navigation";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { InfoHint } from "@/components/shared/info-hint";
import { useInAppNotifications } from "@/features/notifications/hooks/use-in-app-notifications";
import type { NotificationItem } from "@/lib/notifications/view";
import { cn, relativeTime } from "@/lib/utils";

export function NotificationsList({
  initialItems,
  organizationId,
  restrictToUserId = null,
}: {
  initialItems: NotificationItem[];
  organizationId: string;
  restrictToUserId?: string | null;
}) {
  const router = useRouter();
  const { items, unreadCount, markRead, markAllRead, remove } =
    useInAppNotifications({
      initialItems,
      organizationId,
      limit: 50,
      restrictToUserId,
    });

  async function handleSelect(item: NotificationItem) {
    await markRead(item.id);
    if (item.href) router.push(item.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `Tienes ${unreadCount} notificación${unreadCount === 1 ? "" : "es"} sin revisar.`
            : "Todas tus notificaciones están al día."}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={() => {
            void markAllRead();
            toast.success("Notificaciones marcadas como revisadas.");
          }}
        >
          <CheckCheck className="size-4" /> Marcar todo como leído
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <BellRing className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Sin notificaciones por ahora.</p>
            <p className="text-xs text-muted-foreground">
              Aquí aparecerán las nuevas citas y los cambios de tu agenda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "transition-colors",
                !item.readAt && "border-primary/40 bg-accent/30",
              )}
            >
              <CardContent className="flex items-start gap-3 py-4">
                <button
                  type="button"
                  onClick={() => void handleSelect(item)}
                  className="min-w-0 flex-1 text-left outline-none"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    {!item.readAt ? (
                      <span className="size-1.5 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  {item.body ? (
                    <CardDescription className="mt-1">
                      {item.body}
                    </CardDescription>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {relativeTime(item.createdAt)}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <InfoHint
                    content="Abre la cita relacionada y la resaltamos unos segundos para que la encuentres rápido."
                    label="Información sobre esta notificación"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void remove(item.id)}
                    aria-label={`Eliminar notificación: ${item.title}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

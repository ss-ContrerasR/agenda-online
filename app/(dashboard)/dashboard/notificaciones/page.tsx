import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchInAppNotifications } from "@/lib/notifications/queries";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { PageHeader } from "@/components/shared/page-header";
import { InfoHint } from "@/components/shared/info-hint";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  const session = await requireSession();
  const restrictToUserId =
    session.membership.role === "employee" ? session.user.id : null;
  const items = await fetchInAppNotifications(
    await createSupabaseServerClient(),
    session.membership.organization_id,
    50,
    restrictToUserId,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <PageHeader
          title="Notificaciones"
          description="Nuevas citas y cambios de tu agenda. Ábrelas para ir al detalle y eliminar las que ya no necesites."
        />
        <InfoHint
          content="El icono de la campana parpadea mientras haya notificaciones sin revisar. Al abrir la bandeja se marcan como leídas."
          label="Información sobre las notificaciones"
        />
      </div>
      <NotificationsList
        initialItems={items}
        organizationId={session.membership.organization_id}
        restrictToUserId={restrictToUserId}
      />
    </div>
  );
}

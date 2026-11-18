import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth";
import { DesktopSidebar, type SidebarOrg } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { LicenseBanner } from "@/components/dashboard/license-banner";
import type { NotificationItem } from "@/lib/notifications/view";
import { fetchInAppNotifications } from "@/lib/notifications/queries";
import { getCurrentTimestamp } from "@/lib/now";
import { themeCss } from "@/lib/theme";

export async function DashboardShell({
  session,
  children,
}: {
  session: SessionContext;
  children: React.ReactNode;
}) {
  const notificationsUserId =
    session.membership.role === "employee" ? session.user.id : null;
  const [notifications, now] = await Promise.all([
    fetchInAppNotifications(
      await createSupabaseServerClient(),
      session.membership.organization_id,
      20,
      notificationsUserId,
    ),
    getCurrentTimestamp(),
  ]);
  const displayName =
    session.profile?.full_name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Usuario";

  const org: SidebarOrg = {
    name: session.organization.name,
    slug: session.organization.slug,
    logoUrl: session.organization.logo_url,
    role: session.membership.role,
    primary: session.settings.brand_primary,
  };

  return (
    <div className="min-h-dvh bg-background">
      <style
        dangerouslySetInnerHTML={{
          __html: themeCss(
            session.settings.brand_primary,
            session.settings.brand_secondary,
            session.settings.brand_accent,
          ),
        }}
      />
      <DesktopSidebar
        org={org}
        role={session.membership.role}
        isPlatformAdmin={session.isPlatformAdmin}
      />
      <div className="lg:pl-64">
        <Topbar
          org={org}
          role={session.membership.role}
          isPlatformAdmin={session.isPlatformAdmin}
          user={{
            name: displayName,
            email: session.user.email ?? "",
            avatarUrl: session.profile?.avatar_url ?? null,
          }}
          notifications={notifications satisfies NotificationItem[]}
          organizationId={session.membership.organization_id}
          notificationsUserId={notificationsUserId}
        />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <LicenseBanner organization={session.organization} now={now} />
          {children}
        </main>
      </div>
    </div>
  );
}

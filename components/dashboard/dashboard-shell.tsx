import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionContext } from "@/lib/auth";
import { DesktopSidebar, type SidebarOrg } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import type { NotificationItem } from "@/components/dashboard/notifications-menu";
import { themeCss } from "@/lib/theme";

async function getNotifications(session: SessionContext) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, created_at, status")
    .eq("organization_id", session.membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).map<NotificationItem>((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    createdAt: item.created_at,
    status: item.status,
  }));
}

export async function DashboardShell({
  session,
  children,
}: {
  session: SessionContext;
  children: React.ReactNode;
}) {
  const notifications = await getNotifications(session);
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
          notifications={notifications}
        />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

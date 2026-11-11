import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getPlatformAdminUser,
  getSessionContext,
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Skeleton } from "@/components/ui/skeleton";

async function DashboardGate({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) redirect("/configuracion-requerida");

  const session = await getSessionContext();
  if (!session) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/dashboard");
    const admin = await getPlatformAdminUser();
    if (admin) redirect("/admin");
    redirect("/onboarding");
  }

  return <DashboardShell session={session}>{children}</DashboardShell>;
}

function DashboardFallback() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-64 border-r border-border bg-sidebar p-4 lg:block">
        <Skeleton className="h-8 w-36" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-16 border-b border-border px-6 py-4">
          <Skeleton className="h-8 w-52" />
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <div className="px-6">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardGate>{children}</DashboardGate>
    </Suspense>
  );
}

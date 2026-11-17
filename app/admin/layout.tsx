import { Suspense } from "react";
import { requirePlatformAdminContext } from "@/lib/auth";
import { AdminShell } from "@/features/superadmin/components/admin-shell";
import { AdminShellSkeleton } from "@/features/superadmin/components/admin-skeleton";

async function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformAdminContext();
  return <AdminShell user={user}>{children}</AdminShell>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

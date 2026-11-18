import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import { GuidedTour } from "@/components/shared/guided-tour";
import { Button } from "@/components/ui/button";
import { AdminMobileNav, AdminNav } from "./admin-nav";

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const displayName =
    user.user_metadata?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Administrador";

  return (
    <div className="min-h-dvh bg-background">
      <AdminNav displayName={displayName} email={user.email ?? ""} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span className="truncate">Consola de plataforma</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <GuidedTour variant="admin" />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Ir al panel</Link>
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Cerrar sesión
                </Button>
              </form>
            </div>
          </div>
          <AdminMobileNav />
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

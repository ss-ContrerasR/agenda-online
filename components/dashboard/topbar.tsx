"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { InfoHint } from "@/components/shared/info-hint";
import {
  SidebarContent,
  type SidebarOrg,
} from "@/components/dashboard/sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";
import {
  NotificationsMenu,
  type NotificationItem,
} from "@/components/dashboard/notifications-menu";
import type { MemberRole } from "@/types/database";

// El buscador y el tour solo se necesitan al interactuar. Cargarlos aparte
// reduce el JS que se descarga al entrar al panel.
const CommandPalette = dynamic(
  () =>
    import("@/components/dashboard/command-palette").then(
      (module) => module.CommandPalette,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-9 w-full sm:w-64" />,
  },
);

const GuidedTour = dynamic(
  () =>
    import("@/components/shared/guided-tour").then(
      (module) => module.GuidedTour,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="size-9 rounded-md" />,
  },
);

export function Topbar({
  org,
  role,
  isPlatformAdmin,
  user,
  notifications,
  organizationId,
  notificationsUserId = null,
}: {
  org: SidebarOrg;
  role: MemberRole;
  isPlatformAdmin: boolean;
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  notifications: NotificationItem[];
  organizationId: string;
  notificationsUserId?: string | null;
}) {
  const canCreateAppointment = role !== "employee";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SidebarContent
            org={org}
            role={role}
            isPlatformAdmin={isPlatformAdmin}
          />
        </SheetContent>
      </Sheet>

      <div className="hidden flex-1 items-center gap-1.5 sm:flex">
        <CommandPalette role={role} />
        <InfoHint
          content="Busca páginas, clientes y citas escribiendo el nombre. Es el acceso rápido a todo el panel."
          label="Información sobre la búsqueda"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:flex-none">
        <div className="flex items-center gap-1.5 sm:hidden">
          <CommandPalette role={role} />
        </div>
        {canCreateAppointment ? (
          <>
            <div className="hidden items-center gap-1 md:flex">
              <Button asChild size="sm">
                <Link href="/dashboard/citas/nueva">
                  <Plus className="size-4" />
                  Nueva cita
                </Link>
              </Button>
              <InfoHint
                content="Crea una cita manualmente. Si el correo ya tiene una cita activa, el asistente lo detectará antes de confirmar."
                label="Información sobre nueva cita"
              />
            </div>
            <Button asChild size="icon-sm" className="md:hidden">
              <Link href="/dashboard/citas/nueva" aria-label="Nueva cita">
                <Plus className="size-4" />
              </Link>
            </Button>
          </>
        ) : null}
        <GuidedTour variant="dashboard" isPlatformAdmin={isPlatformAdmin} />
        <NotificationsMenu
          items={notifications}
          organizationId={organizationId}
          restrictToUserId={notificationsUserId}
        />
        <ThemeToggle />
        <UserMenu
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          role={role}
          isPlatformAdmin={isPlatformAdmin}
        />
      </div>
    </header>
  );
}

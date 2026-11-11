"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { CommandPalette } from "@/components/dashboard/command-palette";
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

export function Topbar({
  org,
  role,
  isPlatformAdmin,
  user,
  notifications,
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
}) {
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

      <div className="hidden flex-1 sm:block">
        <CommandPalette />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:flex-none">
        <div className="sm:hidden">
          <CommandPalette />
        </div>
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href="/dashboard/citas/nueva">
            <Plus className="size-4" />
            Nueva cita
          </Link>
        </Button>
        <Button asChild size="icon-sm" className="md:hidden">
          <Link href="/dashboard/citas/nueva" aria-label="Nueva cita">
            <Plus className="size-4" />
          </Link>
        </Button>
        <NotificationsMenu items={notifications} />
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

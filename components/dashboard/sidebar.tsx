"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn, getInitialsColor, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import { getNavigation } from "@/components/dashboard/navigation";
import type { MemberRole } from "@/types/database";
import { Logo } from "@/components/shared/logo";
import { ScrollArea } from "@/components/ui/scroll-area";

export type SidebarOrg = {
  name: string;
  slug: string;
  logoUrl: string | null;
  role: MemberRole;
  primary: string;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarContent({
  org,
  role,
  isPlatformAdmin,
  onNavigate,
}: {
  org: SidebarOrg;
  role: MemberRole;
  isPlatformAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = getNavigation(role, isPlatformAdmin);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Logo href="/dashboard" />
      </div>

      <div className="px-3 pt-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2.5 py-2">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt={org.name}
              className="size-8 rounded-md object-cover"
            />
          ) : (
            <span
              className="flex size-8 items-center justify-center rounded-md text-xs font-semibold text-white"
              style={{ backgroundColor: getInitialsColor(org.name) }}
            >
              {initials(org.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{org.name}</p>
            <p className="text-[11px] text-sidebar-muted">
              {ROLE_LABELS[org.role]}
            </p>
          </div>
          {isPlatformAdmin ? (
            <ShieldCheck className="size-4 text-primary" aria-label="Superadministrador" />
          ) : null}
        </div>
      </div>

      <ScrollArea className="mt-3 flex-1 px-3">
        <nav className="space-y-5 pb-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/80">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {active ? (
                        <ChevronRight className="ml-auto size-3.5 text-primary/70" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href={`/reservar/${org.slug}`}
          target="_blank"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <CalendarDays className="size-4" />
          Página de reservas
          <ArrowUpRight className="ml-auto size-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function DesktopSidebar(props: {
  org: SidebarOrg;
  role: MemberRole;
  isPlatformAdmin: boolean;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <SidebarContent {...props} />
    </aside>
  );
}

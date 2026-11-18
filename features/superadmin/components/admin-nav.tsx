"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { InfoHint } from "@/components/shared/info-hint";
import { cn, initials } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Resumen",
    icon: LayoutDashboard,
    info: "Métricas globales y accesos rápidos de la plataforma.",
    exact: true,
  },
  {
    href: "/admin/empresas",
    label: "Empresas",
    icon: Building2,
    info: "Todos los negocios clientes y su disponibilidad.",
  },
  {
    href: "/admin/licencias",
    label: "Licencias",
    icon: ReceiptText,
    info: "Fechas de pago, planes y suspensión de clientes.",
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios y accesos",
    icon: Users,
    info: "Cuentas de la plataforma y suspensiones individuales.",
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    icon: ScrollText,
    info: "Historial de cambios sensibles.",
  },
];

export function AdminNav({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <Logo href="/admin" />
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ShieldCheck className="size-4" />
        </span>
      </div>

      <div className="px-3 pt-4">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Consola de plataforma
          </p>
          <p className="mt-1 truncate text-sm font-medium">Superadministrador</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <div
              key={item.href}
              className={cn(
                "group flex items-center rounded-md pr-1.5 transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
              <InfoHint content={item.info} label={`¿Qué hace ${item.label}?`} />
              {active ? <ChevronRight className="size-3.5 text-primary/70" /> : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver al panel
        </Link>
        <div className="mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

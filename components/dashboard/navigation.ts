import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { can, type Permission } from "@/lib/permissions";
import type { MemberRole } from "@/types/database";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function getNavigation(
  role: MemberRole,
  isPlatformAdmin: boolean,
): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Operación",
      items: [
        {
          label: "Resumen",
          href: "/dashboard",
          icon: LayoutDashboard,
          exact: true,
        },
        { label: "Citas", href: "/dashboard/citas", icon: CalendarDays },
        {
          label: "Clientes",
          href: "/dashboard/clientes",
          icon: Users,
          permission: "clients:read",
        },
      ],
    },
    {
      label: "Catálogo",
      items: [
        { label: "Servicios", href: "/dashboard/servicios", icon: Sparkles },
        {
          label: "Equipo",
          href: "/dashboard/empleados",
          icon: UserRound,
          permission: "employees:read",
        },
        {
          label: "Horarios",
          href: "/dashboard/horarios",
          icon: Clock,
          permission: "schedules:read",
        },
      ],
    },
    {
      label: "Análisis",
      items: [
        {
          label: "Reportes",
          href: "/dashboard/reportes",
          icon: BarChart3,
          permission: "reports:read",
        },
      ],
    },
    {
      label: "Negocio",
      items: [
        {
          label: "Configuración",
          href: "/dashboard/configuracion",
          icon: Settings,
          permission: "settings:write",
        },
        {
          label: "Apariencia",
          href: "/dashboard/apariencia",
          icon: Palette,
          permission: "appearance:write",
        },
        {
          label: "Usuarios y roles",
          href: "/dashboard/usuarios",
          icon: ShieldCheck,
          permission: "users:manage",
        },
      ],
    },
  ];

  if (isPlatformAdmin) {
    groups.push({
      label: "Plataforma",
      items: [
        {
          label: "Empresas",
          href: "/admin",
          icon: Building2,
        },
      ],
    });
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || can(role, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

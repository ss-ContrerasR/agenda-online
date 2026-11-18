import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Clock,
  FolderTree,
  LayoutDashboard,
  Mail,
  Palette,
  ReceiptText,
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
  info: string;
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
          info: "Indicadores del día, citas recientes y estado de tu licencia.",
          exact: true,
        },
        {
          label: "Citas",
          href: "/dashboard/citas",
          icon: CalendarDays,
          info: "Agenda, reprograma y cancela reservas de tus clientes.",
          permission: "appointments:read",
        },
        {
          label: "Clientes",
          href: "/dashboard/clientes",
          icon: Users,
          info: "Fichas de contacto e historial de cada cliente.",
          permission: "clients:read",
        },
      ],
    },
    {
      label: "Catálogo",
      items: [
        {
          label: "Servicios",
          href: "/dashboard/servicios",
          icon: Sparkles,
          info: "Precios, duración y categorías que se muestran al reservar.",
          permission: "services:read",
        },
        {
          label: "Categorías",
          href: "/dashboard/categorias",
          icon: FolderTree,
          info: "Agrupa servicios por tipo, con color y orden para la página pública.",
          permission: "services:read",
        },
        {
          label: "Equipo",
          href: "/dashboard/empleados",
          icon: UserRound,
          info: "Profesionales y empleados, con los servicios que atienden.",
          permission: "employees:read",
        },
        {
          label: "Horarios",
          href: "/dashboard/horarios",
          icon: Clock,
          info: "Disponibilidad general, descansos y excepciones.",
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
          info: "Citas, ocupación e ingresos de los últimos 30 días.",
          permission: "reports:read",
        },
      ],
    },
    {
      label: "Cuenta",
      items: [
        {
          label: "Mi perfil",
          href: "/dashboard/perfil",
          icon: UserRound,
          info: "Tus datos personales, rol y foto de perfil.",
        },
        {
          label: "Notificaciones",
          href: "/dashboard/notificaciones",
          icon: Bell,
          info: "Nuevas citas y cambios de la agenda. Puedes revisarlas y eliminarlas.",
          permission: "notifications:read",
        },
      ],
    },
    {
      label: "Negocio",
      items: [
        {
          label: "Correos",
          href: "/dashboard/correos",
          icon: Mail,
          info: "Diseña tus correos, previsualízalos y envíalos con el correo del propietario.",
          permission: "email:read",
        },
        {
          label: "Configuración",
          href: "/dashboard/configuracion",
          icon: Settings,
          info: "Reglas de reserva, notificaciones y políticas del negocio.",
          permission: "settings:write",
        },
        {
          label: "Apariencia",
          href: "/dashboard/apariencia",
          icon: Palette,
          info: "Colores, logo, portada y textos de tu sitio público.",
          permission: "appearance:write",
        },
        {
          label: "Usuarios y roles",
          href: "/dashboard/usuarios",
          icon: ShieldCheck,
          info: "Crea usuarios, asigna roles y controla quién entra al panel.",
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
          label: "Panel de plataforma",
          href: "/admin",
          icon: Building2,
          info: "Métricas globales y accesos de la consola superadmin.",
          exact: true,
        },
        {
          label: "Todas las empresas",
          href: "/admin/empresas",
          icon: Building2,
          info: "Clientes de la plataforma y estado de cada negocio.",
        },
        {
          label: "Licencias",
          href: "/admin/licencias",
          icon: ReceiptText,
          info: "Fechas de inicio y vencimiento, planes y suspensión de clientes.",
        },
        {
          label: "Todos los usuarios",
          href: "/admin/usuarios",
          icon: ShieldCheck,
          info: "Cuentas de la plataforma y suspensiones individuales.",
        },
        {
          label: "Auditoría",
          href: "/admin/auditoria",
          icon: BarChart3,
          info: "Historial de cambios sensibles realizados en la plataforma.",
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

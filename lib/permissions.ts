import type { MemberRole } from "@/types/database";

export type Permission =
  | "appointments:read"
  | "appointments:write"
  | "appointments:write:own"
  | "clients:read"
  | "clients:write"
  | "clients:read:assigned"
  | "services:read"
  | "services:write"
  | "employees:read"
  | "employees:write"
  | "schedules:read"
  | "schedules:write"
  | "reports:read"
  | "settings:read"
  | "settings:write"
  | "appearance:write"
  | "users:manage"
  | "notifications:read";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    "appointments:read",
    "appointments:write",
    "clients:read",
    "clients:write",
    "services:read",
    "services:write",
    "employees:read",
    "employees:write",
    "schedules:read",
    "schedules:write",
    "reports:read",
    "settings:read",
    "settings:write",
    "appearance:write",
    "users:manage",
    "notifications:read",
  ],
  admin: [
    "appointments:read",
    "appointments:write",
    "clients:read",
    "clients:write",
    "services:read",
    "services:write",
    "employees:read",
    "employees:write",
    "schedules:read",
    "schedules:write",
    "reports:read",
    "settings:read",
    "settings:write",
    "appearance:write",
    "users:manage",
    "notifications:read",
  ],
  receptionist: [
    "appointments:read",
    "appointments:write",
    "clients:read",
    "clients:write",
    "services:read",
    "employees:read",
    "schedules:read",
    "settings:read",
    "reports:read",
  ],
  employee: [
    "appointments:read",
    "appointments:write:own",
    "clients:read:assigned",
    "services:read",
    "employees:read",
    "schedules:read",
    "settings:read",
  ],
};

export function can(role: MemberRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: MemberRole, permissions: Permission[]) {
  return permissions.some((permission) => can(role, permission));
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  receptionist: "Recepcionista",
  employee: "Empleado",
};

export const ASSIGNABLE_ROLES: MemberRole[] = [
  "admin",
  "receptionist",
  "employee",
];

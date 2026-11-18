import type { Json, NotificationRow } from "@/types/database";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  status: string;
  type: string;
  readAt: string | null;
  href: string | null;
  highlightId: string | null;
};

type NotificationSource = Pick<
  NotificationRow,
  | "id"
  | "title"
  | "body"
  | "created_at"
  | "status"
  | "type"
  | "metadata"
> & { read_at?: string | null };

function metadataRecord(metadata: Json): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as Record<string, unknown>;
}

function internalHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/dashboard/")) return null;
  // Evita que un valor de metadata malformado envíe al usuario fuera del panel.
  if (value.startsWith("//")) return null;
  return value;
}

export function notificationHref(metadata: Json): string | null {
  return internalHref(metadataRecord(metadata).href);
}

export function notificationHighlightId(metadata: Json): string | null {
  const value = metadataRecord(metadata).highlight;
  return typeof value === "string" ? value : null;
}

export function mapNotificationRow(row: NotificationSource): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    status: row.status,
    type: row.type,
    readAt: row.read_at ?? null,
    href: notificationHref(row.metadata),
    highlightId: notificationHighlightId(row.metadata),
  };
}

export function isNewAppointmentNotification(type: string) {
  return type === "appointment_created";
}

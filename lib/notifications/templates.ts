/**
 * Eventos de cita que generan notificaciones. El HTML se renderiza con React
 * Email en `lib/notifications/email-template.tsx`.
 */
export type NotificationEvent =
  | "created"
  | "confirmed"
  | "cancelled"
  | "rescheduled"
  | "reminder";

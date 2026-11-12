import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrganizationSettingsRow } from "@/types/database";
import { DEFAULT_SETTINGS } from "@/lib/auth";
import { notifyAppointmentEvent } from "@/lib/notifications/service";
import type { NotificationEvent } from "@/lib/notifications/templates";

/**
 * Carga el contexto de una cita y registra/envía la notificación
 * correspondiente. Un fallo aquí nunca debe revertir la operación principal.
 */
export async function notifyAppointmentById(
  admin: SupabaseClient<Database>,
  appointmentId: string,
  event: NotificationEvent,
  reason?: string | null,
) {
  try {
    const { data: appointment } = await admin
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appointment) return;

    const [organization, client, service, employee, settingsRow] =
      await Promise.all([
        admin
          .from("organizations")
          .select("*")
          .eq("id", appointment.organization_id)
          .maybeSingle(),
        admin.from("clients").select("*").eq("id", appointment.client_id).maybeSingle(),
        admin.from("services").select("*").eq("id", appointment.service_id).maybeSingle(),
        admin.from("employees").select("*").eq("id", appointment.employee_id).maybeSingle(),
        admin
          .from("organization_settings")
          .select("*")
          .eq("organization_id", appointment.organization_id)
          .maybeSingle(),
      ]);

    if (!organization.data || !client.data || !service.data || !employee.data) {
      return;
    }

    const settings: OrganizationSettingsRow = {
      ...DEFAULT_SETTINGS,
      ...(settingsRow.data ?? {}),
      organization_id: appointment.organization_id,
      created_at: settingsRow.data?.created_at ?? organization.data.created_at,
      updated_at: settingsRow.data?.updated_at ?? organization.data.updated_at,
    };

    await notifyAppointmentEvent(admin, {
      event,
      organization: {
        id: organization.data.id,
        name: organization.data.name,
        email: organization.data.email,
        timezone: organization.data.timezone,
        currency: organization.data.currency,
      },
      settings,
      appointment,
      serviceName: service.data.name,
      employeeName: employee.data.full_name,
      client: {
        name: client.data.full_name,
        email: client.data.email,
        phone: client.data.phone,
      },
      reason,
    });
  } catch (error) {
    console.error("No se pudo notificar el cambio de la cita", error);
  }
}

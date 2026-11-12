"use server";

import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { requirePermission, requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { loadAvailability } from "@/features/availability/data";
import { isSlotAvailable } from "@/lib/availability";
import { AppError, fieldErrorsFromZod, getActionError, type ActionResult } from "@/lib/errors";
import { formDataObject } from "@/lib/form";
import { logAudit } from "@/lib/audit";
import { notifyAppointmentById } from "@/lib/notifications/events";
import {
  changeStatusSchema,
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentSchema,
} from "./schemas";
import type { AppointmentStatus } from "@/types/database";

function revalidateAppointmentViews(appointmentId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard/reportes");
  if (appointmentId) revalidatePath(`/dashboard/citas/${appointmentId}`);
}

async function audit(
  organizationId: string,
  userId: string | null,
  action: string,
  entityId: string,
  metadata: Record<string, string | null> = {},
) {
  if (!isAdminClientConfigured()) return;
  await logAudit(createSupabaseAdminClient(), {
    organizationId,
    userId,
    action,
    entity: "appointments",
    entityId,
    metadata,
  });
}

async function notifyIfConfigured(appointmentId: string, event: "created" | "confirmed" | "cancelled" | "rescheduled", reason?: string | null) {
  if (!isAdminClientConfigured()) return;
  await notifyAppointmentById(createSupabaseAdminClient(), appointmentId, event, reason);
}

export async function createAppointmentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createAppointmentSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la cita.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("appointments:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const input = parsed.data;

    const start = fromZonedTime(`${input.date}T${input.time}:00`, session.organization.timezone);
    if (start.getTime() <= Date.now()) {
      throw new AppError("SLOT_IN_PAST", "No puedes agendar una cita en el pasado.");
    }

    const availability = await loadAvailability(supabase, {
      organizationId,
      timezone: session.organization.timezone,
      serviceId: input.serviceId,
      employeeId: input.employeeId,
      date: input.date,
      enforceNotice: false,
      enforceAdvance: false,
    });

    if (!availability) throw new AppError("SERVICE_NOT_FOUND", "El servicio no está disponible.");
    const slot = isSlotAvailable(availability.slots, start.toISOString(), input.employeeId);
    if (!slot) {
      throw new AppError(
        "SLOT_CONFLICT",
        "El horario no está disponible para ese profesional.",
      );
    }

    const { data: created, error } = await supabase.rpc("create_appointment", {
      p_organization_id: organizationId,
      p_client_id: input.clientId,
      p_service_id: input.serviceId,
      p_employee_id: input.employeeId,
      p_starts_at: start.toISOString(),
      p_notes: input.notes,
      p_source: "admin",
      p_created_by: session.user.id,
    });

    if (error || !created) throw error ?? new Error("SLOT_CONFLICT");

    if (created.status === "pending" && input.status === "confirmed") {
      await supabase.rpc("set_appointment_status", {
        p_appointment_id: created.id,
        p_status: "confirmed",
        p_actor: session.user.id,
        p_note: "Confirmada al crear la cita",
      });
    }

    await audit(organizationId, session.user.id, "appointment.created", created.id, {
      status: created.status,
    });
    await notifyIfConfigured(
      created.id,
      created.status === "confirmed" ? "confirmed" : "created",
    );

    revalidateAppointmentViews(created.id);
    return {
      ok: true,
      message: "Cita creada correctamente.",
      data: { id: created.id },
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function updateAppointmentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateAppointmentSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la cita.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("appointments:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const input = parsed.data;

    const { data: current } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", input.appointmentId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!current) throw new AppError("APPOINTMENT_NOT_FOUND", "No encontramos la cita.");
    if (!["pending", "confirmed"].includes(current.status)) {
      throw new AppError(
        "APPOINTMENT_STATUS_LOCKED",
        "Solo puedes editar citas pendientes o confirmadas.",
      );
    }

    const start = fromZonedTime(`${input.date}T${input.time}:00`, session.organization.timezone);

    const availability = await loadAvailability(supabase, {
      organizationId,
      timezone: session.organization.timezone,
      serviceId: input.serviceId,
      employeeId: input.employeeId,
      date: input.date,
      excludeAppointmentId: input.appointmentId,
      enforceNotice: false,
      enforceAdvance: false,
    });

    if (!availability) throw new AppError("SERVICE_NOT_FOUND", "El servicio no está disponible.");
    const slot = isSlotAvailable(availability.slots, start.toISOString(), input.employeeId);
    if (!slot) {
      throw new AppError("SLOT_CONFLICT", "El horario no está disponible para ese profesional.");
    }

    const service = availability.service;
    const end = addMinutes(start, service.duration_minutes + service.buffer_minutes);
    const timeChanged = current.starts_at !== start.toISOString();

    const { data: updated, error } = await supabase
      .from("appointments")
      .update({
        client_id: input.clientId,
        service_id: input.serviceId,
        employee_id: input.employeeId,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        duration_minutes: service.duration_minutes,
        price: service.price,
        notes: input.notes,
        internal_notes: input.internalNotes,
        status: input.status,
      })
      .eq("id", input.appointmentId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error || !updated) throw error ?? new AppError("APPOINTMENT_NOT_FOUND", "No se pudo actualizar la cita.");

    if (timeChanged) {
      await supabase.from("appointment_status_history").insert({
        organization_id: organizationId,
        appointment_id: updated.id,
        from_status: current.status,
        to_status: updated.status,
        changed_by: session.user.id,
        note: "Cita reprogramada desde el panel",
      });
      await notifyIfConfigured(updated.id, "rescheduled");
    }

    await audit(organizationId, session.user.id, "appointment.updated", updated.id);
    revalidateAppointmentViews(updated.id);
    return { ok: true, message: "Cita actualizada correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function rescheduleAppointmentAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = rescheduleAppointmentSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa la nueva fecha y hora.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("appointments:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const input = parsed.data;

    const { data: current } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", input.appointmentId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!current) throw new AppError("APPOINTMENT_NOT_FOUND", "No encontramos la cita.");

    const start = fromZonedTime(`${input.date}T${input.time}:00`, session.organization.timezone);
    if (start.getTime() <= Date.now()) {
      throw new AppError("SLOT_IN_PAST", "No puedes reprogramar al pasado.");
    }

    const availability = await loadAvailability(supabase, {
      organizationId,
      timezone: session.organization.timezone,
      serviceId: current.service_id,
      employeeId: current.employee_id,
      date: input.date,
      excludeAppointmentId: current.id,
      enforceNotice: false,
      enforceAdvance: false,
    });

    if (!availability) throw new AppError("SERVICE_NOT_FOUND", "El servicio no está disponible.");
    const slot = isSlotAvailable(availability.slots, start.toISOString(), current.employee_id);
    if (!slot) {
      throw new AppError("SLOT_CONFLICT", "El horario no está disponible para ese profesional.");
    }

    const { data: updated, error } = await supabase.rpc("reschedule_appointment", {
      p_appointment_id: current.id,
      p_starts_at: start.toISOString(),
      p_actor: session.user.id,
      p_reason: input.reason ?? "Reprogramada desde el panel",
    });

    if (error || !updated) throw error ?? new AppError("APPOINTMENT_NOT_RESCHEDULABLE", "No se pudo reprogramar.");

    await audit(organizationId, session.user.id, "appointment.rescheduled", updated.id);
    await notifyIfConfigured(updated.id, "rescheduled", input.reason);
    revalidateAppointmentViews(updated.id);
    return { ok: true, message: "Cita reprogramada correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function changeAppointmentStatusAction(input: {
  appointmentId: string;
  status: AppointmentStatus;
  note?: string | null;
}): Promise<ActionResult> {
  const parsed = changeStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud inválida." };
  }

  try {
    const session = await requireSession();
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;

    const { data: updated, error } = await supabase.rpc("set_appointment_status", {
      p_appointment_id: parsed.data.appointmentId,
      p_status: parsed.data.status,
      p_actor: session.user.id,
      p_note: parsed.data.note ?? null,
    });

    if (error || !updated) throw error ?? new AppError("APPOINTMENT_NOT_FOUND", "No encontramos la cita.");

    const event =
      parsed.data.status === "confirmed"
        ? "confirmed"
        : parsed.data.status === "cancelled"
          ? "cancelled"
          : null;
    if (event) await notifyIfConfigured(updated.id, event, parsed.data.note);

    await audit(
      organizationId,
      session.user.id,
      `appointment.status.${parsed.data.status}`,
      updated.id,
    );
    revalidateAppointmentViews(updated.id);
    return { ok: true, message: "Estado actualizado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteAppointmentAction(
  appointmentId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("appointments:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;

    const { error } = await supabase
      .from("appointments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", appointmentId)
      .eq("organization_id", organizationId);

    if (error) throw error;

    await audit(organizationId, session.user.id, "appointment.deleted", appointmentId);
    revalidateAppointmentViews(appointmentId);
    return { ok: true, message: "Cita eliminada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

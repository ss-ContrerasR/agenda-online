"use server";

import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { loadAvailability } from "@/features/availability/data";
import { isSlotAvailable } from "@/lib/availability";
import { AppError, getActionError } from "@/lib/errors";
import { fieldErrorsFromZod } from "@/lib/errors";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import { notifyAppointmentEvent } from "@/lib/notifications/service";
import type {
  AppointmentRow,
  ClientRow,
  Database,
  EmployeeRow,
  OrganizationRow,
  OrganizationSettingsRow,
  ServiceRow,
} from "@/types/database";
import {
  cancelPublicAppointmentSchema,
  publicBookingSchema,
  reschedulePublicAppointmentSchema,
  rescheduleSlotsRequestSchema,
  slotsRequestSchema,
} from "@/features/public-booking/schemas";
import { getAppointmentByToken } from "@/features/public-booking/queries";
import type {
  BookingResultData,
  PublicAppointmentDetails,
  SlotsPayload,
} from "@/features/public-booking/types";

export type PublicActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function unavailable(): PublicActionResult<never> {
  return { ok: false, error: "Las reservas en línea no están disponibles." };
}

function employeeList(
  employees: EmployeeRow[],
): SlotsPayload["employees"] {
  return employees.map((employee) => ({
    id: employee.id,
    name: employee.full_name,
    photoUrl: employee.photo_url,
  }));
}

async function resolveOrganization(slug: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

async function findClient(
  admin: SupabaseClient<Database>,
  organizationId: string,
  email: string,
  phone: string,
) {
  if (email) {
    const { data } = await admin
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await admin
    .from("clients")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("phone", phone)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function findExistingAppointment(
  admin: SupabaseClient<Database>,
  organizationId: string,
  clientId: string,
  serviceId: string,
  startsAt: string,
) {
  const { data } = await admin
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .eq("service_id", serviceId)
    .eq("starts_at", startsAt)
    .in("status", ["pending", "confirmed"])
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function upsertClient(
  admin: SupabaseClient<Database>,
  organizationId: string,
  input: { fullName: string; email: string; phone: string },
): Promise<ClientRow> {
  const existing = await findClient(
    admin,
    organizationId,
    input.email,
    input.phone,
  );

  if (existing) {
    const { data, error } = await admin
      .from("clients")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        email: existing.email ?? input.email,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (!error && data) return data;
    return existing;
  }

  const { data, error } = await admin
    .from("clients")
    .insert({
      organization_id: organizationId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
    })
    .select("*")
    .single();

  if (data) return data;

  // Otra solicitud simultánea pudo crear el cliente; se recupera.
  const retry = await findClient(admin, organizationId, input.email, input.phone);
  if (retry) return retry;

  throw error ?? new AppError("CLIENT_NOT_FOUND", "No se pudo registrar el cliente.");
}

async function safeNotify(input: {
  details: PublicAppointmentDetails | {
    organization: OrganizationRow;
    settings: OrganizationSettingsRow;
    service: ServiceRow;
    employee: EmployeeRow;
    client: ClientRow;
  };
  appointment: Pick<AppointmentRow, "id" | "public_token" | "starts_at" | "status">;
  event: "created" | "confirmed" | "cancelled" | "rescheduled";
  reason?: string | null;
}) {
  try {
    const admin = createSupabaseAdminClient();
    await notifyAppointmentEvent(admin, {
      event: input.event,
      organization: {
        id: input.details.organization.id,
        name: input.details.organization.name,
        email: input.details.organization.email,
        timezone: input.details.organization.timezone,
        currency: input.details.organization.currency,
      },
      settings: input.details.settings,
      appointment: input.appointment,
      serviceName: input.details.service.name,
      employeeName: input.details.employee.full_name,
      client: {
        name: input.details.client.full_name,
        email: input.details.client.email,
        phone: input.details.client.phone,
      },
      reason: input.reason ?? null,
    });
  } catch (error) {
    console.error("No se pudo registrar la notificación de la cita", error);
  }
}

export async function loadPublicSlotsAction(
  rawInput: unknown,
): Promise<PublicActionResult<SlotsPayload>> {
  const parsed = slotsRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud de horarios inválida." };
  }

  if (!isAdminClientConfigured()) return unavailable();

  try {
    const admin = createSupabaseAdminClient();
    const organization = await resolveOrganization(parsed.data.slug);
    if (!organization) throw new AppError("ORGANIZATION_NOT_FOUND", "El negocio no está disponible.");

    const availability = await loadAvailability(admin, {
      organizationId: organization.id,
      timezone: organization.timezone,
      serviceId: parsed.data.serviceId,
      date: parsed.data.date,
      employeeId: parsed.data.employeeId ?? null,
      enforceNotice: true,
    });

    if (!availability) {
      throw new AppError("SERVICE_NOT_FOUND", "El servicio no está disponible.");
    }

    return {
      ok: true,
      data: {
        date: parsed.data.date,
        timezone: organization.timezone,
        slots: availability.slots,
        employees: employeeList(availability.employees),
      },
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function loadRescheduleSlotsAction(
  rawInput: unknown,
): Promise<PublicActionResult<SlotsPayload>> {
  const parsed = rescheduleSlotsRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud de horarios inválida." };
  }

  if (!isAdminClientConfigured()) return unavailable();

  try {
    const details = await getAppointmentByToken(parsed.data.token, parsed.data.slug);
    if (!details) throw new AppError("APPOINTMENT_NOT_FOUND", "No encontramos la cita.");

    const admin = createSupabaseAdminClient();
    const availability = await loadAvailability(admin, {
      organizationId: details.organization.id,
      timezone: details.organization.timezone,
      serviceId: details.appointment.service_id,
      date: parsed.data.date,
      employeeId: details.appointment.employee_id,
      excludeAppointmentId: details.appointment.id,
      enforceNotice: true,
    });

    if (!availability) {
      throw new AppError("SERVICE_NOT_FOUND", "El servicio no está disponible.");
    }

    return {
      ok: true,
      data: {
        date: parsed.data.date,
        timezone: details.organization.timezone,
        slots: availability.slots,
        employees: employeeList(availability.employees),
      },
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function createPublicAppointmentAction(
  rawInput: unknown,
): Promise<PublicActionResult<BookingResultData>> {
  const parsed = publicBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos ingresados.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  if (!isAdminClientConfigured()) return unavailable();

  const input = parsed.data;

  try {
    const admin = createSupabaseAdminClient();
    const organization = await resolveOrganization(input.slug);
    if (!organization) throw new AppError("ORGANIZATION_NOT_FOUND", "El negocio no está disponible.");

    const availability = await loadAvailability(admin, {
      organizationId: organization.id,
      timezone: organization.timezone,
      serviceId: input.serviceId,
      date: formatInTimeZone(new Date(input.start), organization.timezone, "yyyy-MM-dd"),
      employeeId: input.employeeId ?? null,
      enforceNotice: true,
    });

    if (!availability) throw new AppError("SERVICE_NOT_FOUND", "El servicio no está disponible.");

    const slot = isSlotAvailable(
      availability.slots,
      input.start,
      input.employeeId ?? undefined,
    );

    if (!slot) {
      throw new AppError(
        "SLOT_CONFLICT",
        "Ese horario acaba de ocuparse. Elige otro horario disponible.",
      );
    }

    const employeeId = input.employeeId ?? slot.employeeIds[0];
    const employee = availability.employees.find((item) => item.id === employeeId);
    if (!employee) throw new AppError("EMPLOYEE_NOT_FOUND", "El profesional no está disponible.");

    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);

    const existingClient = await findClient(admin, organization.id, email, phone);
    if (existingClient) {
      const duplicate = await findExistingAppointment(
        admin,
        organization.id,
        existingClient.id,
        input.serviceId,
        slot.start,
      );
      if (duplicate) {
        return {
          ok: true,
          data: {
            id: duplicate.id,
            token: duplicate.public_token,
            status: duplicate.status,
            startsAt: duplicate.starts_at,
          },
        };
      }
    }

    const client = await upsertClient(admin, organization.id, {
      fullName: input.fullName,
      email,
      phone,
    });

    const { data: appointment, error } = await admin.rpc("create_appointment", {
      p_organization_id: organization.id,
      p_client_id: client.id,
      p_service_id: input.serviceId,
      p_employee_id: employeeId,
      p_starts_at: slot.start,
      p_notes: input.notes,
      p_source: "public",
      p_created_by: null,
    });

    if (error || !appointment) throw error ?? new Error("SLOT_CONFLICT");

    await safeNotify({
      details: {
        organization,
        settings: availability.settings,
        service: availability.service,
        employee,
        client,
      },
      appointment,
      event: appointment.status === "confirmed" ? "confirmed" : "created",
    });

    revalidatePath(`/reservar/${organization.slug}`);
    revalidatePath(`/reservar/${organization.slug}/cita/${appointment.public_token}`);

    return {
      ok: true,
      data: {
        id: appointment.id,
        token: appointment.public_token,
        status: appointment.status,
        startsAt: appointment.starts_at,
      },
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function cancelPublicAppointmentAction(
  rawInput: unknown,
): Promise<PublicActionResult<{ token: string }>> {
  const parsed = cancelPublicAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud inválida." };
  }

  if (!isAdminClientConfigured()) return unavailable();

  try {
    const details = await getAppointmentByToken(parsed.data.token, parsed.data.slug);
    if (!details) throw new AppError("APPOINTMENT_NOT_FOUND", "No encontramos la cita.");

    const admin = createSupabaseAdminClient();
    const { data: appointment, error } = await admin.rpc("cancel_appointment_by_token", {
      p_token: parsed.data.token,
      p_reason: parsed.data.reason,
    });

    if (error || !appointment) throw error ?? new AppError("APPOINTMENT_NOT_CANCELLABLE", "No se pudo cancelar.");

    await safeNotify({
      details,
      appointment,
      event: "cancelled",
      reason: parsed.data.reason,
    });

    revalidatePath(`/reservar/${parsed.data.slug}`);
    revalidatePath(`/reservar/${parsed.data.slug}/cita/${parsed.data.token}`);

    return { ok: true, data: { token: appointment.public_token } };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function reschedulePublicAppointmentAction(
  rawInput: unknown,
): Promise<PublicActionResult<{ token: string }>> {
  const parsed = reschedulePublicAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud inválida." };
  }

  if (!isAdminClientConfigured()) return unavailable();

  try {
    const details = await getAppointmentByToken(parsed.data.token, parsed.data.slug);
    if (!details) throw new AppError("APPOINTMENT_NOT_FOUND", "No encontramos la cita.");

    const admin = createSupabaseAdminClient();
    const { data: appointment, error } = await admin.rpc(
      "reschedule_appointment_by_token",
      {
        p_token: parsed.data.token,
        p_starts_at: parsed.data.start,
      },
    );

    if (error || !appointment) throw error ?? new AppError("APPOINTMENT_NOT_RESCHEDULABLE", "No se pudo reprogramar.");

    await safeNotify({
      details,
      appointment,
      event: "rescheduled",
    });

    revalidatePath(`/reservar/${parsed.data.slug}`);
    revalidatePath(`/reservar/${parsed.data.slug}/cita/${parsed.data.token}`);
    revalidatePath(`/reservar/${parsed.data.slug}/cita/${appointment.public_token}`);

    return { ok: true, data: { token: appointment.public_token } };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditAction } from "@/lib/action-audit";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import {
  businessHoursSchema,
  employeeScheduleSchema,
  parseScheduleForm,
  scheduleBreakSchema,
  scheduleExceptionSchema,
} from "./schemas";

function revalidateSchedules() {
  revalidatePath("/dashboard/horarios");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  revalidateTag("public-organizations", "max");
}

function invalid(
  message: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
): ActionResult {
  return {
    ok: false,
    error: message,
    fieldErrors: fieldErrorsFromZod(issues),
  };
}

/**
 * Los horarios pueden apuntar a un profesional, pero siempre debe pertenecer a
 * la organización de la sesión. Sin esta comprobación un id manipulado podría
 * producir un error de RLS o de llave foránea difícil de entender.
 */
async function assertEmployeeInOrganization(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  employeeId: string | null,
) {
  if (!employeeId) return;
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("El profesional seleccionado no pertenece a esta empresa.");
}

export async function saveBusinessHoursAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // `redirect()` lanza NEXT_REDIRECT: debe ejecutarse fuera del try/catch.
  const session = await requirePermission("schedules:write");
  const parsed = businessHoursSchema.safeParse(parseScheduleForm(formData));
  if (!parsed.success) return invalid("Revisa el horario del día.", parsed.error.issues);

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { error } = await supabase.from("business_hours").upsert(
      {
        organization_id: organizationId,
        ...parsed.data,
      },
      { onConflict: "organization_id,weekday" },
    );
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "business_hours.updated",
      entity: "business_hours",
      metadata: { weekday: parsed.data.weekday },
    });
    revalidateSchedules();
    return { ok: true, message: "Horario guardado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function saveEmployeeScheduleAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requirePermission("schedules:write");
  const parsed = employeeScheduleSchema.safeParse(parseScheduleForm(formData));
  if (!parsed.success) return invalid("Revisa el horario del profesional.", parsed.error.issues);

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    await assertEmployeeInOrganization(supabase, organizationId, parsed.data.employee_id);

    const { error } = await supabase.from("employee_schedules").upsert(
      {
        organization_id: organizationId,
        ...parsed.data,
      },
      { onConflict: "employee_id,weekday" },
    );
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "employee_schedule.updated",
      entity: "employee_schedules",
      metadata: {
        employee_id: parsed.data.employee_id,
        weekday: parsed.data.weekday,
      },
    });
    revalidateSchedules();
    return { ok: true, message: "Horario del profesional guardado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteEmployeeScheduleAction(
  scheduleId: string,
): Promise<ActionResult> {
  const session = await requirePermission("schedules:write");

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { error } = await supabase
      .from("employee_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("organization_id", organizationId);
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "employee_schedule.deleted",
      entity: "employee_schedules",
      entityId: scheduleId,
    });
    revalidateSchedules();
    return { ok: true, message: "Horario eliminado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

/** Crea o actualiza un descanso (almuerzo, pausa, etc.). */
export async function saveScheduleBreakAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requirePermission("schedules:write");
  const parsed = scheduleBreakSchema.safeParse(parseScheduleForm(formData));
  if (!parsed.success) return invalid("Revisa los datos del descanso.", parsed.error.issues);

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { breakId, ...values } = parsed.data;
    await assertEmployeeInOrganization(supabase, organizationId, values.employee_id);

    if (breakId) {
      const { data, error } = await supabase
        .from("schedule_breaks")
        .update(values)
        .eq("id", breakId)
        .eq("organization_id", organizationId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No encontramos ese descanso.");
    } else {
      const { error } = await supabase
        .from("schedule_breaks")
        .insert({ organization_id: organizationId, ...values });
      if (error) throw error;
    }

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: breakId ? "schedule_break.updated" : "schedule_break.created",
      entity: "schedule_breaks",
      entityId: breakId,
      metadata: { weekday: values.weekday },
    });
    revalidateSchedules();
    return {
      ok: true,
      message: breakId ? "Descanso actualizado." : "Descanso agregado.",
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteScheduleBreakAction(
  breakId: string,
): Promise<ActionResult> {
  const session = await requirePermission("schedules:write");

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { error } = await supabase
      .from("schedule_breaks")
      .delete()
      .eq("id", breakId)
      .eq("organization_id", organizationId);
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "schedule_break.deleted",
      entity: "schedule_breaks",
      entityId: breakId,
    });
    revalidateSchedules();
    return { ok: true, message: "Descanso eliminado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function saveScheduleExceptionAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requirePermission("schedules:write");
  const parsed = scheduleExceptionSchema.safeParse(parseScheduleForm(formData));
  if (!parsed.success) return invalid("Revisa los datos de la excepción.", parsed.error.issues);

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { exceptionId, ...values } = parsed.data;
    await assertEmployeeInOrganization(supabase, organizationId, values.employee_id);

    if (exceptionId) {
      const { data, error } = await supabase
        .from("schedule_exceptions")
        .update(values)
        .eq("id", exceptionId)
        .eq("organization_id", organizationId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("No encontramos esa excepción.");
    } else {
      const { error } = await supabase
        .from("schedule_exceptions")
        .insert({ organization_id: organizationId, ...values });
      if (error) throw error;
    }

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: exceptionId
        ? "schedule_exception.updated"
        : "schedule_exception.created",
      entity: "schedule_exceptions",
      entityId: exceptionId,
      metadata: { exception_date: values.exception_date },
    });
    revalidateSchedules();
    return {
      ok: true,
      message: exceptionId
        ? "Excepción actualizada."
        : "Excepción agregada.",
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteScheduleExceptionAction(
  exceptionId: string,
): Promise<ActionResult> {
  const session = await requirePermission("schedules:write");

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { error } = await supabase
      .from("schedule_exceptions")
      .delete()
      .eq("id", exceptionId)
      .eq("organization_id", organizationId);
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "schedule_exception.deleted",
      entity: "schedule_exceptions",
      entityId: exceptionId,
    });
    revalidateSchedules();
    return { ok: true, message: "Excepción eliminada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

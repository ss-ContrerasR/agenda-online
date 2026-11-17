"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auditAction } from "@/lib/action-audit";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import { employeeSchema, parseEmployeeForm, updateEmployeeSchema } from "./schemas";

function revalidateEmployees() {
  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/horarios");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
}

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function syncEmployeeServices(
  supabase: SupabaseServer,
  organizationId: string,
  employeeId: string,
  serviceIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("employee_services")
    .delete()
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId);
  if (deleteError) throw deleteError;

  if (serviceIds.length === 0) return;

  const { error } = await supabase.from("employee_services").insert(
    serviceIds.map((serviceId) => ({
      organization_id: organizationId,
      employee_id: employeeId,
      service_id: serviceId,
    })),
  );
  if (error) throw error;
}

export async function createEmployeeAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(parseEmployeeForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del profesional.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("employees:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { serviceIds, ...values } = parsed.data;

    const { data, error } = await supabase
      .from("employees")
      .insert({ organization_id: organizationId, ...values })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("EMPLOYEE_NOT_FOUND");

    await syncEmployeeServices(supabase, organizationId, data.id, serviceIds);
    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "employee.created",
      entity: "employees",
      entityId: data.id,
      metadata: { full_name: values.full_name },
    });
    revalidateEmployees();
    return { ok: true, message: "Profesional creado correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function updateEmployeeAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateEmployeeSchema.safeParse(parseEmployeeForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del profesional.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("employees:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { employeeId, serviceIds, ...values } = parsed.data;

    const { data, error } = await supabase
      .from("employees")
      .update(values)
      .eq("id", employeeId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("EMPLOYEE_NOT_FOUND");

    await syncEmployeeServices(supabase, organizationId, employeeId, serviceIds);
    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "employee.updated",
      entity: "employees",
      entityId: employeeId,
    });
    revalidateEmployees();
    return { ok: true, message: "Profesional actualizado correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteEmployeeAction(
  employeeId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("employees:write");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", employeeId)
      .eq("organization_id", session.membership.organization_id);

    if (error) throw error;

    const { error: linksError } = await supabase
      .from("employee_services")
      .delete()
      .eq("employee_id", employeeId)
      .eq("organization_id", session.membership.organization_id);
    if (linksError) throw linksError;

    await auditAction({
      organizationId: session.membership.organization_id,
      userId: session.user.id,
      action: "employee.deleted",
      entity: "employees",
      entityId: employeeId,
    });
    revalidateEmployees();
    return { ok: true, message: "Profesional eliminado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function restoreEmployeeAction(
  employeeId: string,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("employees:write");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: null, is_active: true })
      .eq("id", employeeId)
      .eq("organization_id", session.membership.organization_id);

    if (error) throw error;

    await auditAction({
      organizationId: session.membership.organization_id,
      userId: session.user.id,
      action: "employee.restored",
      entity: "employees",
      entityId: employeeId,
    });
    revalidateEmployees();
    return { ok: true, message: "Profesional reactivado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

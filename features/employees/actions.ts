"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { auditAction } from "@/lib/action-audit";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import {
  createEmployeeFromMemberSchema,
  employeeSchema,
  parseEmployeeForm,
  updateEmployeeSchema,
} from "./schemas";

function revalidateEmployees() {
  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/usuarios");
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/horarios");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  revalidateTag("public-organizations", "max");
  revalidateTag("public-directory", "max");
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

/**
 * Agrega como personal a una cuenta existente con rol Empleado. Crea la ficha
 * del profesional y vincula `organization_members.employee_id`, que es lo que
 * usa RLS para mostrarle solo sus propias citas.
 */
export async function createEmployeeFromMemberAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createEmployeeFromMemberSchema.safeParse(
    parseEmployeeForm(formData),
  );
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
    const { memberId, serviceIds, ...values } = parsed.data;

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("id, user_id, role, employee_id")
      .eq("id", memberId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      return {
        ok: false,
        error: "No encontramos esa cuenta en la organización.",
      };
    }
    if (membership.role !== "employee") {
      return {
        ok: false,
        error: "Solo las cuentas con rol Empleado se pueden agregar como personal.",
      };
    }
    if (membership.employee_id) {
      return {
        ok: false,
        error: "Esa cuenta ya está vinculada a un profesional del equipo.",
      };
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .insert({
        organization_id: organizationId,
        user_id: membership.user_id,
        ...values,
      })
      .select("id")
      .single();

    if (error || !employee) throw error ?? new Error("EMPLOYEE_NOT_FOUND");

    // RLS de organization_members solo permite escribir a owner/admin. Con
    // service-role la recepcionista también puede completar la vinculación.
    const linkClient = isAdminClientConfigured()
      ? createSupabaseAdminClient()
      : supabase;
    const { data: linked, error: linkError } = await linkClient
      .from("organization_members")
      .update({ employee_id: employee.id })
      .eq("id", membership.id)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (linkError || !linked) {
      await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id)
        .eq("organization_id", organizationId);
      throw linkError ?? new Error("MEMBER_NOT_FOUND");
    }

    await syncEmployeeServices(supabase, organizationId, employee.id, serviceIds);
    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "employee.created_from_member",
      entity: "employees",
      entityId: employee.id,
      metadata: { full_name: values.full_name, membership_id: membership.id },
    });
    revalidateEmployees();
    return {
      ok: true,
      message: "Personal agregado y vinculado a su cuenta de acceso.",
    };
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

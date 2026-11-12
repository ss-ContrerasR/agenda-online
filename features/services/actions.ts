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
import {
  categorySchema,
  serviceSchema,
  updateCategorySchema,
  updateServiceSchema,
} from "./schemas";

function revalidateCatalog() {
  revalidatePath("/dashboard/servicios");
  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/citas");
}

function parseServiceForm(formData: FormData) {
  return {
    ...Object.fromEntries(
      Array.from(formData.entries())
        .filter(([, value]) => typeof value === "string")
        .map(([key, value]) => [key, value as string]),
    ),
    employeeIds: formData.getAll("employeeIds").map(String),
  };
}

async function syncEmployeeServices(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  serviceId: string,
  employeeIds: string[],
) {
  await supabase
    .from("employee_services")
    .delete()
    .eq("organization_id", organizationId)
    .eq("service_id", serviceId);

  if (employeeIds.length === 0) return;

  const { error } = await supabase.from("employee_services").insert(
    employeeIds.map((employeeId) => ({
      organization_id: organizationId,
      service_id: serviceId,
      employee_id: employeeId,
    })),
  );
  if (error) throw error;
}

export async function createServiceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(parseServiceForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del servicio.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("services:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { employeeIds, ...values } = parsed.data;

    const { data, error } = await supabase
      .from("services")
      .insert({ organization_id: organizationId, ...values })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("SERVICE_NOT_FOUND");

    await syncEmployeeServices(supabase, organizationId, data.id, employeeIds);
    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "service.created",
      entity: "services",
      entityId: data.id,
    });
    revalidateCatalog();
    return { ok: true, message: "Servicio creado correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function updateServiceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateServiceSchema.safeParse(parseServiceForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del servicio.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("services:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const { serviceId, employeeIds, ...values } = parsed.data;

    const { data, error } = await supabase
      .from("services")
      .update(values)
      .eq("id", serviceId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("SERVICE_NOT_FOUND");

    await syncEmployeeServices(supabase, organizationId, serviceId, employeeIds);
    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "service.updated",
      entity: "services",
      entityId: serviceId,
    });
    revalidateCatalog();
    return { ok: true, message: "Servicio actualizado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteServiceAction(serviceId: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("services:write");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("services")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", serviceId)
      .eq("organization_id", session.membership.organization_id);

    if (error) throw error;
    await auditAction({
      organizationId: session.membership.organization_id,
      userId: session.user.id,
      action: "service.deleted",
      entity: "services",
      entityId: serviceId,
    });
    revalidateCatalog();
    return { ok: true, message: "Servicio eliminado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function createCategoryAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la categoría.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("services:write");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("service_categories")
      .insert({
        organization_id: session.membership.organization_id,
        ...parsed.data,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("Categoría no creada");
    revalidateCatalog();
    return { ok: true, message: "Categoría creada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function updateCategoryAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de la categoría.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("services:write");
    const supabase = await createSupabaseServerClient();
    const { categoryId, ...values } = parsed.data;
    const { error } = await supabase
      .from("service_categories")
      .update(values)
      .eq("id", categoryId)
      .eq("organization_id", session.membership.organization_id);

    if (error) throw error;
    revalidateCatalog();
    return { ok: true, message: "Categoría actualizada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("services:write");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("service_categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", categoryId)
      .eq("organization_id", session.membership.organization_id);

    if (error) throw error;
    revalidateCatalog();
    return { ok: true, message: "Categoría eliminada." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

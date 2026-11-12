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
import { formDataObject } from "@/lib/form";
import { clientSchema, updateClientSchema } from "./schemas";

function revalidateClients(clientId?: string) {
  revalidatePath("/dashboard/clientes");
  revalidatePath("/dashboard");
  if (clientId) revalidatePath(`/dashboard/clientes/${clientId}`);
}

export async function createClientAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del cliente.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("clients:write");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        organization_id: session.membership.organization_id,
        ...parsed.data,
      })
      .select("id")
      .single();

    if (error || !data) throw error ?? new Error("CLIENT_NOT_FOUND");

    await auditAction({
      organizationId: session.membership.organization_id,
      userId: session.user.id,
      action: "client.created",
      entity: "clients",
      entityId: data.id,
    });
    revalidateClients(data.id);
    return { ok: true, message: "Cliente creado correctamente.", data: { id: data.id } };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function updateClientAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateClientSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del cliente.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("clients:write");
    const supabase = await createSupabaseServerClient();
    const { clientId, ...values } = parsed.data;

    const { data, error } = await supabase
      .from("clients")
      .update(values)
      .eq("id", clientId)
      .eq("organization_id", session.membership.organization_id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("CLIENT_NOT_FOUND");

    await auditAction({
      organizationId: session.membership.organization_id,
      userId: session.user.id,
      action: "client.updated",
      entity: "clients",
      entityId: data.id,
    });
    revalidateClients(data.id);
    return { ok: true, message: "Cliente actualizado correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("clients:write");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("clients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", clientId)
      .eq("organization_id", session.membership.organization_id);

    if (error) throw error;

    await auditAction({
      organizationId: session.membership.organization_id,
      userId: session.user.id,
      action: "client.deleted",
      entity: "clients",
      entityId: clientId,
    });
    revalidateClients();
    return { ok: true, message: "Cliente eliminado." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

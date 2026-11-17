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
import { parseSettingsForm, settingsSchema } from "./schemas";

/**
 * El directorio `/negocios` y los metadatos de `/reservar/[slug]` se cachean
 * por etiqueta. Cualquier cambio de nombre/ciudad/descripción debe invalidarlos.
 */
function revalidatePublicBusiness(slug: string) {
  revalidateTag("public-organizations", "max");
  revalidateTag("public-directory", "max");
  revalidatePath("/negocios");
  revalidatePath(`/reservar/${slug}`);
}

function revalidateSettings(slug: string) {
  revalidatePath("/dashboard/configuracion");
  revalidatePath("/dashboard/horarios");
  revalidatePath("/dashboard/citas");
  revalidatePath("/dashboard");
  revalidatePublicBusiness(slug);
}

export async function updateSettingsAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(parseSettingsForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de configuración.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("settings:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const {
      name,
      description,
      phone,
      email,
      address,
      city,
      country,
      timezone,
      currency,
      ...settingValues
    } = parsed.data;

    const { error: organizationError } = await supabase
      .from("organizations")
      .update({
        name,
        description,
        phone,
        email,
        address,
        city,
        country,
        timezone,
        currency,
      })
      .eq("id", organizationId);
    if (organizationError) throw organizationError;

    const { error: settingsError } = await supabase
      .from("organization_settings")
      .update(settingValues)
      .eq("organization_id", organizationId);
    if (settingsError) throw settingsError;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "settings.updated",
      entity: "organization_settings",
      entityId: organizationId,
      metadata: { name, city, description },
    });
    revalidateSettings(session.organization.slug);
    return { ok: true, message: "Configuración guardada correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

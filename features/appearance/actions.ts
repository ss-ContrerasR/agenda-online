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
import type { Json } from "@/types/database";
import { appearanceSchema, parseAppearanceForm } from "./schemas";

/**
 * Colores, temas, logo, portada y SEO son consumidos por el portal público
 * cacheado. Se invalidan las etiquetas del directorio y la ruta `/negocios`
 * además del portal `/reservar/[slug]`.
 */
function revalidatePublicBusiness(slug: string) {
  revalidateTag("public-organizations", "max");
  revalidateTag("public-directory", "max");
  revalidatePath("/negocios");
  revalidatePath(`/reservar/${slug}`);
}

function revalidateAppearance(slug: string) {
  revalidatePath("/dashboard/apariencia");
  revalidatePath("/dashboard");
  revalidatePublicBusiness(slug);
}

export async function updateAppearanceAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = appearanceSchema.safeParse(parseAppearanceForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de apariencia.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requirePermission("appearance:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const {
      logo_url,
      cover_url,
      instagram,
      facebook,
      whatsapp,
      ...settingValues
    } = parsed.data;

    const socials: Json = {
      instagram: instagram ?? null,
      facebook: facebook ?? null,
      whatsapp: whatsapp ?? null,
    };

    const { error: organizationError } = await supabase
      .from("organizations")
      .update({ logo_url, cover_url })
      .eq("id", organizationId);
    if (organizationError) throw organizationError;

    const { error: settingsError } = await supabase
      .from("organization_settings")
      .update({ ...settingValues, socials })
      .eq("organization_id", organizationId);
    if (settingsError) throw settingsError;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: "appearance.updated",
      entity: "organization_settings",
      entityId: organizationId,
      metadata: { theme_preset: settingValues.theme_preset },
    });
    revalidateAppearance(session.organization.slug);
    return { ok: true, message: "Apariencia guardada correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

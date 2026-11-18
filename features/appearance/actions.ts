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

const LOGO_BUCKET = "organization-assets";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function logoObjectPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split("?")[0] ?? null;
}

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

/**
 * Sube (o quita) el logo desde Configuración. Usa el mismo bucket público que
 * las fotos de perfil y actualiza `organizations.logo_url`, que también consume
 * el portal público. El permiso `appearance:write` limita el cambio a
 * propietario/admin.
 */
export async function uploadOrganizationLogoAction(
  formData: FormData,
): Promise<ActionResult> {
  const removeLogo = formData.get("remove_logo") === "true";
  const logo = formData.get("logo");

  if (!removeLogo && !(logo instanceof File && logo.size > 0)) {
    return {
      ok: false,
      error: "Selecciona una imagen JPG, PNG o WebP para el logo.",
    };
  }

  try {
    const session = await requirePermission("appearance:write");
    const supabase = await createSupabaseServerClient();
    const organizationId = session.membership.organization_id;
    const previousLogo = session.organization.logo_url ?? null;

    let logoUrl: string | null = null;

    if (!removeLogo && logo instanceof File) {
      const extension = LOGO_TYPES[logo.type];
      if (!extension) {
        return { ok: false, error: "El logo debe ser una imagen JPG, PNG o WebP." };
      }
      if (logo.size > MAX_LOGO_BYTES) {
        return { ok: false, error: "El logo no puede superar los 2 MB." };
      }

      const path = `${organizationId}/logo/${crypto.randomUUID()}.${extension}`;
      const bytes = new Uint8Array(await logo.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, bytes, {
          contentType: logo.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw new Error("No se pudo subir el logo de la empresa.");

      logoUrl = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase
      .from("organizations")
      .update({ logo_url: logoUrl })
      .eq("id", organizationId);
    if (error) throw error;

    await auditAction({
      organizationId,
      userId: session.user.id,
      action: removeLogo ? "organization.logo_removed" : "organization.logo_uploaded",
      entity: "organizations",
      entityId: organizationId,
      metadata: { logo_url: logoUrl },
    });

    const oldPath = logoObjectPath(previousLogo);
    if (
      oldPath &&
      oldPath.startsWith(`${organizationId}/logo/`) &&
      oldPath !== logoObjectPath(logoUrl)
    ) {
      await supabase.storage.from(LOGO_BUCKET).remove([oldPath]);
    }

    revalidatePath("/dashboard", "layout");
    revalidateAppearance(session.organization.slug);
    return {
      ok: true,
      message: removeLogo
        ? "Logo de la empresa eliminado."
        : "Logo de la empresa actualizado.",
      data: { logoUrl },
    };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

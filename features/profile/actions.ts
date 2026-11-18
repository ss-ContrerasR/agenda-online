"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import { formDataObject } from "@/lib/form";
import { profileSchema } from "./schemas";

const AVATAR_BUCKET = "organization-assets";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function avatarObjectPath(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split("?")[0] ?? null;
}

export async function updateProfileAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de tu perfil.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const session = await requireSession();
    const supabase = await createSupabaseServerClient();
    const userId = session.user.id;
    const organizationId = session.membership.organization_id;
    const previousAvatar = session.profile?.avatar_url ?? null;

    let avatarUrl = previousAvatar;
    const removeAvatar = formData.get("remove_avatar") === "true";
    const avatar = formData.get("avatar");

    if (removeAvatar) {
      avatarUrl = null;
    } else if (avatar instanceof File && avatar.size > 0) {
      const extension = ALLOWED_TYPES[avatar.type];
      if (!extension) {
        return {
          ok: false,
          error: "La foto debe ser JPG, PNG o WebP.",
          fieldErrors: { avatar: "Formato de imagen no permitido." },
        };
      }
      if (avatar.size > MAX_AVATAR_BYTES) {
        return {
          ok: false,
          error: "La foto no puede superar los 2 MB.",
          fieldErrors: { avatar: "Imagen demasiado grande." },
        };
      }

      const path = `${organizationId}/avatars/${userId}/${crypto.randomUUID()}.${extension}`;
      const bytes = new Uint8Array(await avatar.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, bytes, {
          contentType: avatar.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error("No se pudo subir la foto de perfil.");
      }

      avatarUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data
        .publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    if (error) throw error;

    // El nombre del menú de la consola se toma del metadata de Auth. Si falla,
    // el perfil ya quedó guardado y no queremos revertir la operación.
    await supabase.auth.updateUser({
      data: { full_name: parsed.data.full_name },
    });

    const oldPath = avatarObjectPath(previousAvatar);
    if (
      oldPath &&
      oldPath.startsWith(`${organizationId}/avatars/${userId}/`) &&
      oldPath !== avatarObjectPath(avatarUrl)
    ) {
      await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/perfil");
    return { ok: true, message: "Perfil actualizado correctamente." };
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }
}

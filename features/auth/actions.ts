"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { slugify } from "@/lib/utils";
import {
  fieldErrorsFromZod,
  getActionError,
  type ActionResult,
} from "@/lib/errors";
import { formDataObject, safeNextPath } from "@/lib/form";
import { loginSchema, onboardingSchema, registerSchema } from "./schemas";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/auth";

export async function signInAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos ingresados.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return {
          ok: false,
          error: "Debes confirmar tu correo antes de ingresar.",
        };
      }
      return { ok: false, error: "Correo o contraseña incorrectos." };
    }
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signUpAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos ingresados.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.full_name },
        emailRedirectTo: `${publicEnv.appUrl}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return {
          ok: false,
          error: "Ya existe una cuenta con ese correo. Inicia sesión.",
        };
      }
      return { ok: false, error: getActionError(error) };
    }

    if (!data.session) {
      return {
        ok: true,
        message:
          "Cuenta creada. Revisa tu correo para confirmar la cuenta y continuar.",
      };
    }
  } catch (error) {
    return { ok: false, error: getActionError(error) };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function completeOnboardingAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos ingresados.",
      fieldErrors: fieldErrorsFromZod(parsed.error.issues),
    };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  try {
    const admin = createSupabaseAdminClient();

    const { data: existingMembership } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingMembership) {
      redirect("/dashboard");
    }

    const baseSlug = slugify(parsed.data.name) || "mi-negocio";
    let slug = baseSlug;
    let attempt = 1;
    while (attempt < 25) {
      const { data: clash } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${baseSlug}-${attempt}`;
      attempt += 1;
    }

    const { data: organization, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: parsed.data.name,
        slug,
        phone: parsed.data.phone || null,
        email: user.email ?? null,
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
      })
      .select("*")
      .single();

    if (orgError || !organization) {
      throw orgError ?? new Error("No se pudo crear la organización.");
    }

    const { error: settingsError } = await admin
      .from("organization_settings")
      .insert({
        organization_id: organization.id,
        ...DEFAULT_SETTINGS,
      });

    if (settingsError) throw settingsError;

    const { error: memberError } = await admin
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) throw memberError;

    await admin.from("business_hours").insert(
      Array.from({ length: 7 }, (_, weekday) => ({
        organization_id: organization.id,
        weekday,
        is_open: weekday !== 0,
        open_time: "09:00",
        close_time: "18:00",
        break_start: weekday === 0 ? null : "13:00",
        break_end: weekday === 0 ? null : "14:00",
      })),
    );

    await admin.from("profiles").upsert({
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ??
        parsed.data.name,
      email: user.email ?? null,
    });

    await admin.from("audit_logs").insert({
      organization_id: organization.id,
      user_id: user.id,
      action: "organization.created",
      entity: "organizations",
      entity_id: organization.id,
      metadata: { name: organization.name },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return { ok: false, error: getActionError(error) };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

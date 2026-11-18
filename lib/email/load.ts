import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  DEFAULT_EMAIL_TEMPLATE,
  toEmailTemplateConfig,
  type EmailTemplateConfig,
} from "@/lib/email/config";

/**
 * Carga la plantilla de correo de la organización y completa el remitente con
 * el correo del propietario cuando la plantilla no define uno.
 */
export async function fetchOwnerEmail(
  client: SupabaseClient<Database>,
  organizationId: string,
): Promise<string | null> {
  const { data: membership } = await client
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership?.user_id) return null;

  const { data: profile } = await client
    .from("profiles")
    .select("email")
    .eq("id", membership.user_id)
    .maybeSingle();

  return profile?.email ?? null;
}

export async function loadEmailTemplate(
  client: SupabaseClient<Database>,
  organization: { id: string; name: string; email: string | null },
  options?: { fallbackAccent?: string },
): Promise<EmailTemplateConfig> {
  const [{ data: row }, ownerEmail] = await Promise.all([
    client
      .from("email_templates")
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle(),
    fetchOwnerEmail(client, organization.id),
  ]);

  const config = row
    ? toEmailTemplateConfig(row)
    : {
        ...DEFAULT_EMAIL_TEMPLATE,
        accentColor: options?.fallbackAccent ?? DEFAULT_EMAIL_TEMPLATE.accentColor,
      };

  return {
    ...config,
    senderName: config.senderName ?? organization.name,
    senderEmail: config.senderEmail ?? ownerEmail ?? organization.email,
  };
}

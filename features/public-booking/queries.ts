import "server-only";

import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS } from "@/lib/auth";
import type {
  OrganizationRow,
  OrganizationSettingsRow,
} from "@/types/database";
import type {
  PublicAppointmentDetails,
  PublicBookingData,
} from "@/features/public-booking/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Slug público compartido por el portal de reservas y sus alias. */
export const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Un negocio solo sirve su portal público mientras esté activo y al corriente
 * con la plataforma. Se aplica al catálogo, a los metadatos y a la gestión
 * de citas por token.
 */
function isPubliclyActive(
  organization: Pick<OrganizationRow, "is_active" | "billing_status">,
) {
  return (
    organization.is_active &&
    (organization.billing_status === "active" ||
      organization.billing_status === "trialing")
  );
}

function withDefaults(
  organizationId: string,
  row: Partial<OrganizationSettingsRow> | null,
): OrganizationSettingsRow {
  return {
    organization_id: organizationId,
    ...DEFAULT_SETTINGS,
    ...(row ?? {}),
    created_at: row?.created_at ?? new Date().toISOString(),
    updated_at: row?.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Catálogo público de una organización (servicios, equipo, horarios).
 * Se usa el cliente service-role porque el visitante no tiene sesión; todas
 * las consultas están acotadas por organización y por registros activos.
 */
export async function getPublicBookingData(
  slug: string,
): Promise<PublicBookingData | null> {
  if (!isAdminClientConfigured()) return null;
  if (!PUBLIC_SLUG_PATTERN.test(slug)) return null;

  const admin = createSupabaseAdminClient();

  const { data: organization } = await admin
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .in("billing_status", ["active", "trialing"])
    .is("deleted_at", null)
    .maybeSingle();

  if (!organization || !isPubliclyActive(organization)) return null;

  const [
    { data: settingsRow },
    { data: categories },
    { data: services },
    { data: employees },
    { data: employeeServices },
    { data: businessHours },
  ] = await Promise.all([
    admin
      .from("organization_settings")
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle(),
    admin
      .from("service_categories")
      .select("*")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    admin
      .from("services")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    admin
      .from("employees")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    admin
      .from("employee_services")
      .select("employee_id, service_id")
      .eq("organization_id", organization.id),
    admin
      .from("business_hours")
      .select("*")
      .eq("organization_id", organization.id)
      .order("weekday", { ascending: true }),
  ]);

  const settings = withDefaults(organization.id, settingsRow);
  const now = new Date();

  return {
    organization,
    settings,
    categories: categories ?? [],
    services: services ?? [],
    employees: employees ?? [],
    employeeServices: employeeServices ?? [],
    businessHours: businessHours ?? [],
    minDate: formatInTimeZone(now, organization.timezone, "yyyy-MM-dd"),
    maxDate: formatInTimeZone(
      addDays(now, settings.max_advance_days),
      organization.timezone,
      "yyyy-MM-dd",
    ),
  };
}

export async function getAppointmentByToken(
  token: string,
  slug?: string,
): Promise<PublicAppointmentDetails | null> {
  if (!isAdminClientConfigured()) return null;
  if (!UUID_PATTERN.test(token)) return null;

  const admin = createSupabaseAdminClient();

  const { data: appointment } = await admin
    .from("appointments")
    .select("*")
    .eq("public_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!appointment) return null;

  const [
    { data: organization },
    { data: settingsRow },
    { data: service },
    { data: employee },
    { data: client },
    { data: history },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("*")
      .eq("id", appointment.organization_id)
      .eq("is_active", true)
      .in("billing_status", ["active", "trialing"])
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("organization_settings")
      .select("*")
      .eq("organization_id", appointment.organization_id)
      .maybeSingle(),
    admin
      .from("services")
      .select("*")
      .eq("id", appointment.service_id)
      .maybeSingle(),
    admin
      .from("employees")
      .select("*")
      .eq("id", appointment.employee_id)
      .maybeSingle(),
    admin.from("clients").select("*").eq("id", appointment.client_id).maybeSingle(),
    admin
      .from("appointment_status_history")
      .select("*")
      .eq("appointment_id", appointment.id)
      .order("created_at", { ascending: true }),
  ]);

  if (
    !organization ||
    !isPubliclyActive(organization) ||
    !service ||
    !employee ||
    !client
  ) {
    return null;
  }
  if (slug && organization.slug !== slug) return null;

  return {
    appointment,
    organization,
    settings: withDefaults(organization.id, settingsRow),
    service,
    employee,
    client,
    history: history ?? [],
  };
}

/**
 * Metadatos SEO del portal público. Se cachea con etiqueta para poder
 * invalidarla cuando el negocio cambie su configuración o apariencia.
 */
export async function getPublicOrganizationSeo(slug: string) {
  "use cache";
  cacheTag("public-organizations", `public-organization:${slug}`);
  cacheLife("days");

  if (!isAdminClientConfigured()) return null;

  const admin = createSupabaseAdminClient();
  const { data: organization } = await admin
    .from("organizations")
    .select(
      "id, name, description, city, logo_url, cover_url, is_active, billing_status",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .in("billing_status", ["active", "trialing"])
    .is("deleted_at", null)
    .maybeSingle();

  if (!organization || !isPubliclyActive(organization)) return null;

  const { data: settings } = await admin
    .from("organization_settings")
    .select("seo_title, seo_description, public_about")
    .eq("organization_id", organization.id)
    .maybeSingle();

  return {
    name: organization.name,
    description:
      settings?.seo_description ??
      organization.description ??
      settings?.public_about ??
      null,
    title: settings?.seo_title ?? null,
    city: organization.city,
    logoUrl: organization.logo_url,
    coverUrl: organization.cover_url,
  };
}

/** Datos de un negocio para el directorio público de la plataforma. */
export type PublicOrganizationCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  serviceCount: number;
  categories: string[];
};

/**
 * Directorio público de negocios activos. Dos consultas adicionales (servicios
 * y categorías) permiten el conteo y los filtros sin hacer una consulta por
 * negocio. Se etiqueta para invalidar el directorio al activar/suspender un
 * negocio o al cambiar sus servicios.
 */
export async function listPublicOrganizations(): Promise<
  PublicOrganizationCard[]
> {
  "use cache";
  cacheTag("public-organizations", "public-directory");
  cacheLife("minutes");

  if (!isAdminClientConfigured()) return [];

  const admin = createSupabaseAdminClient();
  const { data: organizations } = await admin
    .from("organizations")
    .select("id, name, slug, description, logo_url, city, country")
    .eq("is_active", true)
    .in("billing_status", ["active", "trialing"])
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (!organizations?.length) return [];

  const organizationIds = organizations.map((organization) => organization.id);

  const [{ data: services }, { data: categories }] = await Promise.all([
    admin
      .from("services")
      .select("organization_id, category_id")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("organization_id", organizationIds),
    admin
      .from("service_categories")
      .select("id, name, organization_id")
      .is("deleted_at", null)
      .in("organization_id", organizationIds),
  ]);

  const categoryNames = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );
  const serviceCounts = new Map<string, number>();
  const categoryNamesByOrg = new Map<string, Set<string>>();

  for (const service of services ?? []) {
    serviceCounts.set(
      service.organization_id,
      (serviceCounts.get(service.organization_id) ?? 0) + 1,
    );

    const categoryName = service.category_id
      ? categoryNames.get(service.category_id)
      : undefined;
    if (!categoryName) continue;

    const names =
      categoryNamesByOrg.get(service.organization_id) ?? new Set<string>();
    names.add(categoryName);
    categoryNamesByOrg.set(service.organization_id, names);
  }

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    logoUrl: organization.logo_url,
    city: organization.city,
    country: organization.country,
    serviceCount: serviceCounts.get(organization.id) ?? 0,
    categories: Array.from(
      categoryNamesByOrg.get(organization.id) ?? [],
    ).sort((a, b) => a.localeCompare(b, "es")),
  }));
}

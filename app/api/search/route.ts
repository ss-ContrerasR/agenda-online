import { NextResponse, type NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchResult = {
  type: "appointment" | "client" | "service" | "employee";
  title: string;
  subtitle: string;
  href: string;
};

const MAX_RESULTS_PER_TYPE = 5;

/**
 * Búsqueda global del panel. Se ejecuta con el cliente de sesión para que RLS
 * limite los resultados al negocio del usuario. Devuelve pocos registros por
 * tipo y solo las columnas que muestra el command palette.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  // PostgREST usa comas y paréntesis como separadores en los filtros `or`.
  const term = query.replace(/[%_,()]/g, " ").trim();
  if (!term) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Sin organización activa" }, { status: 403 });
  }

  const organizationId = membership.organization_id;
  const pattern = `%${term}%`;

  const [clients, services, employees, organization] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, email, phone")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(
        `full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
      )
      .order("full_name", { ascending: true })
      .limit(MAX_RESULTS_PER_TYPE),
    supabase
      .from("services")
      .select("id, name, duration_minutes")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .order("name", { ascending: true })
      .limit(MAX_RESULTS_PER_TYPE),
    supabase
      .from("employees")
      .select("id, full_name, position")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(
        `full_name.ilike.${pattern},email.ilike.${pattern},position.ilike.${pattern}`,
      )
      .order("full_name", { ascending: true })
      .limit(MAX_RESULTS_PER_TYPE),
    supabase
      .from("organizations")
      .select("timezone")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  const clientRows = clients.data ?? [];
  const serviceRows = services.data ?? [];
  const employeeRows = employees.data ?? [];
  const timezone = organization.data?.timezone ?? "America/Bogota";

  const ids = (values: Array<{ id: string }>) => values.map((row) => row.id);
  const clientIds = ids(clientRows);
  const serviceIds = ids(serviceRows);
  const employeeIds = ids(employeeRows);

  const appointmentFilters: string[] = [];
  if (clientIds.length) appointmentFilters.push(`client_id.in.(${clientIds})`);
  if (serviceIds.length) appointmentFilters.push(`service_id.in.(${serviceIds})`);
  if (employeeIds.length) {
    appointmentFilters.push(`employee_id.in.(${employeeIds})`);
  }

  const appointmentRows = appointmentFilters.length
    ? (
        await supabase
          .from("appointments")
          .select("id, starts_at, status, client_id, service_id, employee_id")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .or(appointmentFilters.join(","))
          .order("starts_at", { ascending: false })
          .limit(MAX_RESULTS_PER_TYPE)
      ).data ?? []
    : [];

  const relatedClientIds = Array.from(
    new Set(appointmentRows.map((row) => row.client_id)),
  );
  const relatedServiceIds = Array.from(
    new Set(appointmentRows.map((row) => row.service_id)),
  );
  const relatedEmployeeIds = Array.from(
    new Set(appointmentRows.map((row) => row.employee_id)),
  );

  const [appointmentClients, appointmentServices, appointmentEmployees] =
    await Promise.all([
      relatedClientIds.length
        ? supabase
            .from("clients")
            .select("id, full_name")
            .eq("organization_id", organizationId)
            .in("id", relatedClientIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
      relatedServiceIds.length
        ? supabase
            .from("services")
            .select("id, name")
            .eq("organization_id", organizationId)
            .in("id", relatedServiceIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      relatedEmployeeIds.length
        ? supabase
            .from("employees")
            .select("id, full_name")
            .eq("organization_id", organizationId)
            .in("id", relatedEmployeeIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; full_name: string }>,
          }),
    ]);

  const clientNames = new Map(
    (appointmentClients.data ?? []).map((row) => [row.id, row.full_name]),
  );
  const serviceNames = new Map(
    (appointmentServices.data ?? []).map((row) => [row.id, row.name]),
  );
  const employeeNames = new Map(
    (appointmentEmployees.data ?? []).map((row) => [row.id, row.full_name]),
  );

  const results: SearchResult[] = [
    ...clientRows.map((client) => ({
      type: "client" as const,
      title: client.full_name,
      subtitle: client.email ?? client.phone ?? "Cliente",
      href: `/dashboard/clientes/${client.id}`,
    })),
    ...serviceRows.map((service) => ({
      type: "service" as const,
      title: service.name,
      subtitle: `${service.duration_minutes} min`,
      href: "/dashboard/servicios",
    })),
    ...employeeRows.map((employee) => ({
      type: "employee" as const,
      title: employee.full_name,
      subtitle: employee.position ?? "Profesional",
      href: "/dashboard/empleados",
    })),
    ...appointmentRows.map((appointment) => ({
      type: "appointment" as const,
      title: `${clientNames.get(appointment.client_id) ?? "Cliente"} · ${
        serviceNames.get(appointment.service_id) ?? "Servicio"
      }`,
      subtitle: `${formatInTimeZone(
        new Date(appointment.starts_at),
        timezone,
        "d MMM · HH:mm",
      )} · ${employeeNames.get(appointment.employee_id) ?? "Profesional"}`,
      href: `/dashboard/citas/${appointment.id}`,
    })),
  ];

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  );
}

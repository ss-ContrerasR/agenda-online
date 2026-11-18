import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { OrganizationLogoField } from "@/features/settings/components/organization-logo-field";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const session = await requirePermission("settings:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Datos del negocio y reglas aplicadas a las reservas y notificaciones."
      />
      {can(session.membership.role, "appearance:write") ? (
        <OrganizationLogoField
          name={session.organization.name}
          logoUrl={session.organization.logo_url}
        />
      ) : null}
      <SettingsForm
        organization={session.organization}
        settings={session.settings}
        canEdit={can(session.membership.role, "settings:write")}
      />
    </div>
  );
}

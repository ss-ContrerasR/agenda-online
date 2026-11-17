import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { AppearanceForm } from "@/features/appearance/components/appearance-form";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Apariencia" };

export default async function AppearancePage() {
  const session = await requirePermission("settings:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apariencia"
        description="Personaliza los colores, el portal público y la identidad visual de tu negocio."
      />
      <AppearanceForm
        organization={session.organization}
        settings={session.settings}
        canEdit={can(session.membership.role, "appearance:write")}
      />
    </div>
  );
}

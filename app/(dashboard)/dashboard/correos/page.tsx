import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isEmailConfigured } from "@/lib/notifications/email";
import { getEmailStudioData } from "@/features/email/queries";
import { EmailStudio } from "@/features/email/components/email-studio";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Correos" };

export default async function EmailsPage() {
  const session = await requirePermission("email:read");
  const { template, previewHtml, previewCtaUrl } = await getEmailStudioData(
    session.organization,
    session.settings.brand_primary,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correos"
        description="Personaliza el diseño de tus correos, previsualízalo y envía mensajes con el correo del propietario."
      />
      <EmailStudio
        organizationName={session.organization.name}
        template={template}
        initialPreviewHtml={previewHtml}
        previewCtaUrl={previewCtaUrl}
        canWrite={can(session.membership.role, "email:write")}
        canSend={can(session.membership.role, "email:send")}
        isOwner={session.membership.role === "owner"}
        emailConfigured={isEmailConfigured()}
      />
    </div>
  );
}

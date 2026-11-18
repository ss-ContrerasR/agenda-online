import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { InfoHint } from "@/components/shared/info-hint";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const session = await requireSession();
  const displayName =
    session.profile?.full_name?.trim() ||
    session.user.email?.split("@")[0] ||
    "Usuario";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <PageHeader
          title="Mi perfil"
          description="Administra tus datos personales y tu foto dentro de AgendaTEX."
        />
        <InfoHint
          content="Cada usuario de la organización tiene su propio perfil. Los cambios se reflejan de inmediato en el menú de usuario."
          label="Información sobre Mi perfil"
        />
      </div>
      <ProfileForm
        fullName={displayName}
        email={session.user.email ?? ""}
        phone={session.profile?.phone ?? null}
        avatarUrl={session.profile?.avatar_url ?? null}
        role={session.membership.role}
        organizationName={session.organization.name}
      />
    </div>
  );
}

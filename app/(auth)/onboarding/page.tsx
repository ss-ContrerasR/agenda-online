import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { OnboardingForm } from "@/features/auth/onboarding-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Configura tu negocio",
};

async function OnboardingGate() {
  if (!isSupabaseConfigured) redirect("/configuracion-requerida");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  const session = await getSessionContext();
  if (session) redirect("/dashboard");

  return (
    <OnboardingForm
      defaultName={(user.user_metadata?.full_name as string | undefined) ?? ""}
      email={user.email ?? ""}
    />
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <OnboardingGate />
    </Suspense>
  );
}

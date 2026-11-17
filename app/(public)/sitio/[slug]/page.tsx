import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PUBLIC_SLUG_PATTERN } from "@/features/public-booking/queries";

/**
 * Alias amigable: /sitio/<slug> redirige al portal de reservas real.
 * El slug se valida con la misma expresión usada por las consultas públicas.
 */
export default function SiteAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <SiteAliasRedirect params={params} />
    </Suspense>
  );
}

async function SiteAliasRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<null> {
  const { slug } = await params;

  if (!PUBLIC_SLUG_PATTERN.test(slug)) notFound();

  redirect(`/reservar/${slug}`);
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uploadOrganizationLogoAction } from "@/features/appearance/actions";
import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InfoHint } from "@/components/shared/info-hint";
import { getInitialsColor, initials } from "@/lib/utils";

/**
 * Logo de la empresa dentro de Configuración. Solo se renderiza para quien
 * tiene permiso `appearance:write` (owner/admin); la acción vuelve a validar el
 * permiso en servidor. Reutiliza `organizations.logo_url`, también consumido
 * por el portal público.
 */
export function OrganizationLogoField({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [currentLogoUrl, setCurrentLogoUrl] = useState(logoUrl);

  useEffect(() => {
    // La sesión se cachea unos segundos: sincronizamos cuando llega el prop
    // fresco de una navegación o refresh.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentLogoUrl(logoUrl);
  }, [logoUrl]);

  function run(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await uploadOrganizationLogoAction(formData);
        if (!result.ok) {
          toast.error(result.error ?? "No se pudo actualizar el logo.");
          return;
        }
        const nextLogoUrl =
          result.data && typeof result.data === "object"
            ? ((result.data as { logoUrl?: string | null }).logoUrl ?? null)
            : null;
        setCurrentLogoUrl(nextLogoUrl);
        if (inputRef.current) inputRef.current.value = "";
        toast.success(result.message ?? "Logo actualizado.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el logo.",
        );
      }
    });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("logo", file);
    run(formData);
  }

  function handleRemove() {
    const formData = new FormData();
    formData.set("remove_logo", "true");
    run(formData);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Logo de la empresa</CardTitle>
          <InfoHint
            content="Solo el propietario o un administrador puede cambiar el logo. Aparece en el panel y en el portal público de reservas."
            label="Información sobre el logo de la empresa"
          />
        </div>
        <CardDescription>
          Imagen que identifica a tu negocio en AgendaTEX y en la página de reservas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        {currentLogoUrl ? (
          <AppImage
            src={currentLogoUrl}
            alt={name}
            width={64}
            height={64}
            sizes="64px"
            className="size-16 rounded-lg border border-border object-cover"
          />
        ) : (
          <span
            className="flex size-16 items-center justify-center rounded-lg text-lg font-semibold text-white"
            style={{ backgroundColor: getInitialsColor(name) }}
          >
            {initials(name)}
          </span>
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {currentLogoUrl ? "Cambiar logo" : "Cargar logo"}
            </Button>
            {currentLogoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" /> Quitar logo
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {pending ? "Guardando logo…" : "JPG, PNG o WebP · máximo 2 MB"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
          aria-label="Archivo del logo de la empresa"
        />
      </CardContent>
    </Card>
  );
}

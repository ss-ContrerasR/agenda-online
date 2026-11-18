"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAction } from "@/features/profile/actions";
import { initialActionState } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/permissions";
import { initials } from "@/lib/utils";
import type { MemberRole } from "@/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { InfoHint } from "@/components/shared/info-hint";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function ProfileForm({
  fullName,
  email,
  phone,
  avatarUrl,
  role,
  organizationName,
}: {
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: MemberRole;
  organizationName: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Perfil actualizado correctamente.");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }, [state, router]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
    setRemovePhoto(false);
  }

  function handleRemovePhoto() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
    setRemovePhoto(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  const displayedAvatar = removePhoto ? null : (previewUrl ?? avatarUrl);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="remove_avatar" value={removePhoto ? "true" : "false"} />
      <input
        ref={fileRef}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Foto de perfil</CardTitle>
            <InfoHint
              content="Tu foto aparece en el menú de usuario del panel. Usa una imagen JPG, PNG o WebP de hasta 2 MB."
              label="Información sobre la foto de perfil"
            />
          </div>
          <CardDescription>
            Personaliza la imagen que identifica a tu cuenta dentro de AgendaTEX.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-20 border border-border">
            {displayedAvatar ? (
              <AvatarImage src={displayedAvatar} alt={fullName} />
            ) : null}
            <AvatarFallback className="text-lg">{initials(fullName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
              >
                <Camera className="size-4" /> Cambiar foto
              </Button>
              {(displayedAvatar || removePhoto) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePhoto}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" /> Quitar foto
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {pending ? "Guardando cambios…" : "JPG, PNG o WebP · máximo 2 MB"}
            </p>
            <FieldError message={state.fieldErrors?.avatar} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Datos personales</CardTitle>
            <InfoHint
              content="Estos datos identifican al usuario que entra al panel. El correo se usa para iniciar sesión y no se cambia aquí."
              label="Información sobre los datos personales"
            />
          </div>
          <CardDescription>
            Tu nombre y teléfono de contacto dentro de la organización.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={pending} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="full_name">Nombre completo *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={fullName}
                  aria-invalid={Boolean(state.fieldErrors?.full_name)}
                />
                <FieldError message={state.fieldErrors?.full_name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo de acceso</Label>
                <Input id="email" value={email} readOnly className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">
                  Se usa para iniciar sesión en AgendaTEX.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={30}
                  defaultValue={phone ?? ""}
                  placeholder="Ej. 300 123 4567"
                />
                <FieldError message={state.fieldErrors?.phone} />
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-muted-foreground">
                <UserRound className="size-3.5" />
                {ROLE_LABELS[role]}
              </span>
              <span className="text-muted-foreground">
                Organización: <span className="text-foreground">{organizationName}</span>
              </span>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

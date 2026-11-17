"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { updateAppearanceAction } from "@/features/appearance/actions";
import { socialValue } from "@/features/appearance/schemas";
import { initialActionState } from "@/lib/errors";
import { THEME_PRESETS, themeStyle } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Json, OrganizationRow, OrganizationSettingsRow, PublicTheme } from "@/types/database";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function FormSelect({
  name,
  value,
  onValueChange,
  options,
}: {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="mt-2 h-28 w-full rounded-lg border border-border object-cover"
    />
  );
}

export function AppearanceForm({
  organization,
  settings,
  canEdit = true,
}: {
  organization: OrganizationRow;
  settings: OrganizationSettingsRow;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateAppearanceAction,
    initialActionState,
  );
  const [primary, setPrimary] = useState(settings.brand_primary);
  const [secondary, setSecondary] = useState(settings.brand_secondary);
  const [accent, setAccent] = useState(settings.brand_accent);
  const [preset, setPreset] = useState(settings.theme_preset);
  const [publicTheme, setPublicTheme] = useState<PublicTheme>(settings.public_theme);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(organization.cover_url ?? "");
  const [heroUrl, setHeroUrl] = useState(settings.public_hero_url ?? "");

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Apariencia guardada");
    router.refresh();
  }, [state, router]);

  const previewStyle = themeStyle(primary, secondary, accent);
  const socials = settings.socials as Json;

  function applyPreset(id: string, colors?: { primary: string; secondary: string; accent: string }) {
    setPreset(id);
    if (colors) {
      setPrimary(colors.primary);
      setSecondary(colors.secondary);
      setAccent(colors.accent);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>
              Así se verán los botones y acentos en tu portal de reservas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-xl border border-border bg-card p-5"
              style={previewStyle as React.CSSProperties}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex size-11 items-center justify-center rounded-xl text-lg font-bold text-primary-foreground"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {organization.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{organization.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /reservar/{organization.slug}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                  Botón principal
                </span>
                <span
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: "var(--brand-secondary)" }}
                >
                  Secundario
                </span>
                <span
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: "var(--brand-accent)" }}
                >
                  Acento
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="colors">
          <TabsList>
            <TabsTrigger value="colors">
              <Palette /> Colores y tema
            </TabsTrigger>
            <TabsTrigger value="public">
              <Eye /> Portal público
            </TabsTrigger>
            <TabsTrigger value="assets">Imágenes y SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="colors">
            <fieldset disabled={!canEdit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Paleta de marca</CardTitle>
                <CardDescription>
                  Elige una plantilla o personaliza los colores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {THEME_PRESETS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        applyPreset(item.id, {
                          primary: item.primary,
                          secondary: item.secondary,
                          accent: item.accent,
                        })
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors",
                        preset === item.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="flex -space-x-1">
                        {[item.primary, item.secondary, item.accent].map((color) => (
                          <span
                            key={color}
                            className="size-4 rounded-full border-2 border-card"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <span className="truncate font-medium">{item.name}</span>
                    </button>
                  ))}
                </div>

                <input type="hidden" name="theme_preset" value={preset} />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand_primary">Color principal</Label>
                    <Input
                      id="brand_primary"
                      name="brand_primary"
                      type="color"
                      value={primary}
                      onChange={(event) => {
                        setPrimary(event.target.value);
                        setPreset("custom");
                      }}
                      className="h-9.5 p-1"
                    />
                    <FieldError message={state.fieldErrors?.brand_primary} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand_secondary">Color secundario</Label>
                    <Input
                      id="brand_secondary"
                      name="brand_secondary"
                      type="color"
                      value={secondary}
                      onChange={(event) => {
                        setSecondary(event.target.value);
                        setPreset("custom");
                      }}
                      className="h-9.5 p-1"
                    />
                    <FieldError message={state.fieldErrors?.brand_secondary} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand_accent">Color de acento</Label>
                    <Input
                      id="brand_accent"
                      name="brand_accent"
                      type="color"
                      value={accent}
                      onChange={(event) => {
                        setAccent(event.target.value);
                        setPreset("custom");
                      }}
                      className="h-9.5 p-1"
                    />
                    <FieldError message={state.fieldErrors?.brand_accent} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Modo del portal</Label>
                    <FormSelect
                      name="public_theme"
                      value={publicTheme}
                      onValueChange={(value) => setPublicTheme(value as PublicTheme)}
                      options={[
                        { value: "system", label: "Según el dispositivo" },
                        { value: "light", label: "Claro" },
                        { value: "dark", label: "Oscuro" },
                      ]}
                    />
                    <FieldError message={state.fieldErrors?.public_theme} />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="dark_mode_enabled"
                        name="dark_mode_enabled"
                        defaultChecked={settings.dark_mode_enabled}
                      />
                      <Label htmlFor="dark_mode_enabled" className="font-normal">
                        Permitir modo oscuro
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </fieldset>
          </TabsContent>

          <TabsContent value="public">
            <fieldset disabled={!canEdit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contenido del portal</CardTitle>
                <CardDescription>
                  Textos y enlaces que ve el visitante al reservar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="public_hero_url">Imagen de portada del portal</Label>
                  <Input
                    id="public_hero_url"
                    name="public_hero_url"
                    type="url"
                    value={heroUrl}
                    onChange={(event) => setHeroUrl(event.target.value)}
                    placeholder="https://…"
                  />
                  <ImagePreview url={heroUrl} alt="Portada del portal" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="public_about">Sobre el negocio</Label>
                  <Textarea
                    id="public_about"
                    name="public_about"
                    rows={4}
                    maxLength={2000}
                    defaultValue={settings.public_about ?? ""}
                    placeholder="Cuéntale a tus clientes quiénes son"
                  />
                  <FieldError message={state.fieldErrors?.public_about} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      name="instagram"
                      defaultValue={socialValue(socials, "instagram")}
                      placeholder="https://instagram.com/…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      name="facebook"
                      defaultValue={socialValue(socials, "facebook")}
                      placeholder="https://facebook.com/…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      defaultValue={socialValue(socials, "whatsapp")}
                      placeholder="https://wa.me/57…"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </fieldset>
          </TabsContent>

          <TabsContent value="assets">
            <fieldset disabled={!canEdit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Imágenes y SEO</CardTitle>
                <CardDescription>
                  Identidad visual y metadatos para motores de búsqueda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="logo_url">URL del logo</Label>
                    <Input
                      id="logo_url"
                      name="logo_url"
                      type="url"
                      value={logoUrl}
                      onChange={(event) => setLogoUrl(event.target.value)}
                      placeholder="https://…"
                    />
                    <ImagePreview url={logoUrl} alt="Logo" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover_url">URL de la imagen de cubierta</Label>
                    <Input
                      id="cover_url"
                      name="cover_url"
                      type="url"
                      value={coverUrl}
                      onChange={(event) => setCoverUrl(event.target.value)}
                      placeholder="https://…"
                    />
                    <ImagePreview url={coverUrl} alt="Cubierta" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo_title">Título SEO</Label>
                  <Input
                    id="seo_title"
                    name="seo_title"
                    maxLength={120}
                    defaultValue={settings.seo_title ?? ""}
                    placeholder="Ej. Reserva tu cita en Bella Studio"
                  />
                  <FieldError message={state.fieldErrors?.seo_title} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo_description">Descripción SEO</Label>
                  <Textarea
                    id="seo_description"
                    name="seo_description"
                    rows={3}
                    maxLength={300}
                    defaultValue={settings.seo_description ?? ""}
                    placeholder="Máximo 300 caracteres"
                  />
                  <FieldError message={state.fieldErrors?.seo_description} />
                </div>
              </CardContent>
            </Card>
            </fieldset>
          </TabsContent>
        </Tabs>

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "Guardando…" : "Guardar apariencia"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

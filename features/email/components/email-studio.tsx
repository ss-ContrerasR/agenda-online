"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  renderEmailPreviewAction,
  saveEmailTemplateAction,
  sendCustomEmailAction,
} from "@/features/email/actions";
import { initialActionState } from "@/lib/errors";
import {
  EMAIL_LAYOUTS,
  type EmailTemplateConfig,
} from "@/lib/email/config";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const HTTP_URL = /^https?:\/\//i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStudioProps = {
  organizationName: string;
  template: EmailTemplateConfig;
  initialPreviewHtml: string;
  previewCtaUrl: string;
  canWrite: boolean;
  canSend: boolean;
  isOwner: boolean;
  emailConfigured: boolean;
  emailProvider: { id: string; label: string } | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <Checkbox
        id={id}
        name={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ColorField({
  name,
  label,
  value,
  onChange,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={name}
          name={name}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 shrink-0 p-1"
        />
        <Input
          aria-label={`${label} (hexadecimal)`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs uppercase"
          maxLength={7}
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

function toPreviewConfig(config: EmailTemplateConfig) {
  return {
    ...config,
    logoUrl: config.logoUrl && HTTP_URL.test(config.logoUrl) ? config.logoUrl : null,
    senderEmail:
      config.senderEmail && EMAIL_PATTERN.test(config.senderEmail)
        ? config.senderEmail
        : null,
    socials: config.socials.filter((social) => HTTP_URL.test(social.url)),
  };
}

/**
 * Compara el estado del editor con lo guardado ignorando diferencias que el
 * servidor normaliza (espacios, mayúsculas de colores y orden de enlaces).
 */
function normalizeForCompare(config: EmailTemplateConfig) {
  return {
    layout: config.layout,
    logoUrl: config.logoUrl?.trim() || null,
    accentColor: config.accentColor.toLowerCase(),
    backgroundColor: config.backgroundColor.toLowerCase(),
    textColor: config.textColor.toLowerCase(),
    senderName: config.senderName?.trim() || null,
    senderEmail: config.senderEmail?.trim().toLowerCase() || null,
    headerTitle: config.headerTitle?.trim() || null,
    headerSubtitle: config.headerSubtitle?.trim() || null,
    footerText: config.footerText?.trim() || null,
    buttonLabel: config.buttonLabel?.trim() || null,
    showLogo: config.showLogo,
    showDetails: config.showDetails,
    socials: config.socials
      .map((social) => ({
        label: social.label.trim(),
        url: social.url.trim(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export function EmailStudio({
  organizationName,
  template,
  initialPreviewHtml,
  previewCtaUrl,
  canWrite,
  canSend,
  isOwner,
  emailConfigured,
  emailProvider,
}: EmailStudioProps) {
  const router = useRouter();
  const [config, setConfig] = useState<EmailTemplateConfig>(template);
  const [previewHtml, setPreviewHtml] = useState(initialPreviewHtml);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveState, saveAction, saving] = useActionState(
    saveEmailTemplateAction,
    initialActionState,
  );
  const [sendState, sendAction, sending] = useActionState(
    sendCustomEmailAction,
    initialActionState,
  );
  const firstPreview = useRef(true);
  const sendFormRef = useRef<HTMLFormElement>(null);

  const initialJson = useMemo(
    () => JSON.stringify(normalizeForCompare(template)),
    [template],
  );
  const isDirty =
    JSON.stringify(normalizeForCompare(config)) !== initialJson;

  useEffect(() => {
    if (firstPreview.current) {
      firstPreview.current = false;
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await renderEmailPreviewAction({
          config: toPreviewConfig(config),
          content: {
            heading: "Tu próxima cita",
            intro:
              "Este es un ejemplo de cómo llegarán tus correos. Personaliza el diseño y guárdalo para aplicarlo a todos los envíos.",
            ctaUrl: previewCtaUrl,
            ctaLabel: config.buttonLabel || "Ver mi cita",
          },
        });
        if (cancelled) return;
        setPreviewLoading(false);
        if (result.ok && result.html) {
          setPreviewHtml(result.html);
          setPreviewError(null);
        } else {
          setPreviewError(result.error ?? "No se pudo generar la vista previa.");
        }
      } catch {
        if (cancelled) return;
        setPreviewLoading(false);
        setPreviewError("No se pudo generar la vista previa.");
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setPreviewLoading(false);
    };
  }, [config, previewCtaUrl]);

  useEffect(() => {
    if (!saveState.ok) {
      if (saveState.error && !saveState.fieldErrors) toast.error(saveState.error);
      return;
    }
    toast.success(saveState.message ?? "Plantilla guardada");
    router.refresh();
  }, [saveState, router]);

  useEffect(() => {
    if (!sendState.ok) {
      if (sendState.error && !sendState.fieldErrors) toast.error(sendState.error);
      return;
    }
    toast.success(sendState.message ?? "Correo enviado");
    sendFormRef.current?.reset();
    router.refresh();
  }, [sendState, router]);

  function update<K extends keyof EmailTemplateConfig>(
    key: K,
    value: EmailTemplateConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function updateSocial(key: string, value: string) {
    setConfig((current) => {
      const others = current.socials.filter((social) => social.label !== key);
      return {
        ...current,
        socials: value.trim()
          ? [...others, { label: key, url: value }]
          : others,
      };
    });
  }

  function socialValue(label: string) {
    return config.socials.find((social) => social.label === label)?.url ?? "";
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start">
      <Tabs defaultValue="design" className="min-w-0">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="design" className="gap-1.5">
            <Eye className="size-4" /> Diseño
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5">
            <Send className="size-4" /> Enviar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="mt-4">
          <form action={saveAction} className="space-y-4">
            <fieldset disabled={!canWrite} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Disposición</CardTitle>
                  <CardDescription>
                    Elige cómo se organizan el encabezado, los detalles y el botón.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-3">
                  {EMAIL_LAYOUTS.map((layout) => (
                    <label
                      key={layout.id}
                      className={cn(
                        "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm transition-colors",
                        config.layout === layout.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="layout"
                        value={layout.id}
                        checked={config.layout === layout.id}
                        onChange={() => update("layout", layout.id)}
                        className="mt-0.5 accent-primary"
                      />
                      <span className="space-y-0.5">
                        <span className="block font-medium">{layout.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {layout.description}
                        </span>
                      </span>
                    </label>
                  ))}
                  <FieldError message={saveState.fieldErrors?.layout} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Marca</CardTitle>
                  <CardDescription>
                    Logo, colores y remitente que verá el destinatario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="logo_url">URL del logo</Label>
                    <Input
                      id="logo_url"
                      name="logo_url"
                      value={config.logoUrl ?? ""}
                      onChange={(event) => update("logoUrl", event.target.value)}
                      placeholder="https://tu-dominio.com/logo.png"
                    />
                    <p className="text-xs text-muted-foreground">
                      Usa una imagen pública en PNG, JPG o SVG (recomendado 256 px de ancho).
                    </p>
                    <FieldError message={saveState.fieldErrors?.logo_url} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <ColorField
                      name="accent_color"
                      label="Color principal"
                      value={config.accentColor}
                      onChange={(value) => update("accentColor", value)}
                      error={saveState.fieldErrors?.accent_color}
                    />
                    <ColorField
                      name="background_color"
                      label="Fondo"
                      value={config.backgroundColor}
                      onChange={(value) => update("backgroundColor", value)}
                      error={saveState.fieldErrors?.background_color}
                    />
                    <ColorField
                      name="text_color"
                      label="Texto"
                      value={config.textColor}
                      onChange={(value) => update("textColor", value)}
                      error={saveState.fieldErrors?.text_color}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sender_name">Nombre del remitente</Label>
                      <Input
                        id="sender_name"
                        name="sender_name"
                        value={config.senderName ?? ""}
                        onChange={(event) => update("senderName", event.target.value)}
                        placeholder={organizationName}
                      />
                      <FieldError message={saveState.fieldErrors?.sender_name} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sender_email">Correo del propietario</Label>
                      <Input
                        id="sender_email"
                        name="sender_email"
                        type="email"
                        value={config.senderEmail ?? ""}
                        onChange={(event) => update("senderEmail", event.target.value)}
                        placeholder="propietario@tu-dominio.com"
                        readOnly={!isOwner}
                        aria-readonly={!isOwner}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isOwner
                          ? emailProvider?.id === "brevo"
                            ? "Debe ser un remitente verificado en Brevo (no necesitas dominio propio). Si no coincide, se usará como “Responder a”."
                            : "Si el dominio no está verificado en Resend, se usará como “Responder a”."
                          : "Solo el propietario puede cambiar la dirección de envío."}
                      </p>
                      <FieldError message={saveState.fieldErrors?.sender_email} />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <ToggleField
                      id="show_logo"
                      label="Mostrar logo"
                      description="Oculta el logo y deja solo el nombre del negocio."
                      checked={config.showLogo}
                      onChange={(value) => update("showLogo", value)}
                    />
                    <ToggleField
                      id="show_details"
                      label="Mostrar detalles"
                      description="Incluye la tabla con servicio, fecha y hora."
                      checked={config.showDetails}
                      onChange={(value) => update("showDetails", value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Textos</CardTitle>
                  <CardDescription>
                    Encabezado, pie y etiqueta del botón. Déjalos vacíos para usar el
                    contenido automático de cada correo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="header_title">Título del encabezado</Label>
                    <Input
                      id="header_title"
                      name="header_title"
                      value={config.headerTitle ?? ""}
                      onChange={(event) => update("headerTitle", event.target.value)}
                      placeholder={organizationName}
                      maxLength={140}
                    />
                    <FieldError message={saveState.fieldErrors?.header_title} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="header_subtitle">Subtítulo</Label>
                    <Input
                      id="header_subtitle"
                      name="header_subtitle"
                      value={config.headerSubtitle ?? ""}
                      onChange={(event) => update("headerSubtitle", event.target.value)}
                      placeholder="Agenda tu próxima cita"
                      maxLength={200}
                    />
                    <FieldError message={saveState.fieldErrors?.header_subtitle} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="button_label">Etiqueta del botón</Label>
                      <Input
                        id="button_label"
                        name="button_label"
                        value={config.buttonLabel ?? ""}
                        onChange={(event) => update("buttonLabel", event.target.value)}
                        placeholder="Ver mi cita"
                        maxLength={40}
                      />
                      <FieldError message={saveState.fieldErrors?.button_label} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="footer_text">Pie de correo</Label>
                      <Input
                        id="footer_text"
                        name="footer_text"
                        value={config.footerText ?? ""}
                        onChange={(event) => update("footerText", event.target.value)}
                        placeholder="Gracias por preferirnos"
                        maxLength={300}
                      />
                      <FieldError message={saveState.fieldErrors?.footer_text} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enlaces sociales</CardTitle>
                  <CardDescription>
                    Opcionales. Se muestran al final del correo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {[
                    { key: "Instagram", field: "social_instagram" },
                    { key: "Facebook", field: "social_facebook" },
                    { key: "WhatsApp", field: "social_whatsapp" },
                    { key: "Sitio web", field: "social_website" },
                  ].map((social) => (
                    <div key={social.field} className="space-y-1.5">
                      <Label htmlFor={social.field}>{social.key}</Label>
                      <Input
                        id={social.field}
                        name={social.field}
                        value={socialValue(social.key)}
                        onChange={(event) =>
                          updateSocial(social.key, event.target.value)
                        }
                        placeholder="https://..."
                      />
                      <FieldError message={saveState.fieldErrors?.[social.field]} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving || !canWrite}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Guardar plantilla
                </Button>
                {isDirty ? (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertCircle className="size-3.5" />
                    Hay cambios sin guardar.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5" />
                    Plantilla guardada.
                  </span>
                )}
              </div>
              {!canWrite ? (
                <p className="text-xs text-muted-foreground">
                  Tu rol puede consultar la plantilla, pero no editarla.
                </p>
              ) : null}
            </fieldset>
          </form>
        </TabsContent>

        <TabsContent value="send" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Enviar un correo</CardTitle>
              <CardDescription>
                Se usa el diseño guardado y el correo del propietario como
                remitente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!emailConfigured ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      El envío aún no está configurado. Puedes guardar el diseño y
                      activarlo cuando quieras.
                    </span>
                  </p>
                  <div className="mt-2 pl-6">
                    <p className="font-medium">
                      Opción gratuita sin dominio propio: Brevo
                    </p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs">
                      <li>Crea una cuenta gratis en brevo.com.</li>
                      <li>Verifica tu correo en Senders y define el remitente.</li>
                      <li>
                        Añade <code>BREVO_API_KEY</code> y{" "}
                        <code>BREVO_FROM_EMAIL</code> en el servidor.
                      </li>
                    </ol>
                    <p className="mt-2 text-xs">
                      Incluye 300 correos al día. También puedes usar{" "}
                      <code>RESEND_API_KEY</code> con un dominio verificado.
                    </p>
                  </div>
                </div>
              ) : null}

              {isDirty ? (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Tienes cambios de diseño sin guardar. El envío usa la última
                    plantilla guardada.
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Mail className="size-4" />
                    Remitente
                  </p>
                  {emailProvider ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        emailProvider.id === "brevo"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
                      )}
                    >
                      Envío con {emailProvider.label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-muted-foreground">
                  {config.senderName ?? organizationName} ·{" "}
                  {config.senderEmail ?? "Sin correo del propietario"}
                </p>
                {emailProvider?.id === "brevo" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Plan gratuito: 300 correos al día. El remitente debe estar
                    verificado en Brevo.
                  </p>
                ) : null}
                {emailProvider?.id === "resend" ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Resend sin dominio verificado solo entrega al correo dueño de
                    la cuenta. Para enviar a tus clientes, activa Brevo (gratis).
                  </p>
                ) : null}
              </div>

              <form ref={sendFormRef} action={sendAction} className="space-y-4">
                <fieldset disabled={!canSend} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="to">Destinatario</Label>
                    <Input
                      id="to"
                      name="to"
                      type="email"
                      required
                      placeholder="cliente@correo.com"
                    />
                    <FieldError message={sendState.fieldErrors?.to} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Asunto</Label>
                    <Input
                      id="subject"
                      name="subject"
                      required
                      maxLength={140}
                      placeholder="Novedades de tu próxima visita"
                    />
                    <FieldError message={sendState.fieldErrors?.subject} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="heading">Título dentro del correo</Label>
                    <Input
                      id="heading"
                      name="heading"
                      maxLength={140}
                      placeholder="Déjalo vacío para usar el asunto"
                    />
                    <FieldError message={sendState.fieldErrors?.heading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      maxLength={4000}
                      placeholder="Escribe el contenido del correo..."
                    />
                    <FieldError message={sendState.fieldErrors?.message} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cta_label">Texto del botón</Label>
                      <Input
                        id="cta_label"
                        name="cta_label"
                        maxLength={40}
                        placeholder="Reservar ahora"
                      />
                      <FieldError message={sendState.fieldErrors?.cta_label} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cta_url">Enlace del botón</Label>
                      <Input
                        id="cta_url"
                        name="cta_url"
                        placeholder="https://..."
                      />
                      <FieldError message={sendState.fieldErrors?.cta_url} />
                    </div>
                  </div>

                  {sendState.error ? (
                    <p className="flex items-start gap-1.5 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      {sendState.error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={sending || !canSend || !emailConfigured}
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Enviar correo
                  </Button>
                  {!canSend ? (
                    <p className="text-xs text-muted-foreground">
                      Tu rol no tiene permiso para enviar correos.
                    </p>
                  ) : null}
                </fieldset>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="lg:sticky lg:top-20">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Vista previa</CardTitle>
              <CardDescription>
                Se actualiza mientras editas el diseño.
              </CardDescription>
            </div>
            {previewLoading ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Actualizando
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {previewError ? (
              <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                {previewError}
              </p>
            ) : null}
            <iframe
              title="Vista previa del correo"
              srcDoc={previewHtml}
              sandbox=""
              className="h-[640px] w-full rounded-lg border border-border bg-white"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

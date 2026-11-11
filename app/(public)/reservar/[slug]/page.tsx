import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { getPublicBookingData, getPublicOrganizationSeo } from "@/features/public-booking/queries";
import {
  OpenBookingButton,
  PublicBookingProvider,
} from "@/features/public-booking/booking-provider";
import type {
  BookingConfig,
  BookingService,
} from "@/features/public-booking/booking-wizard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { themeCss } from "@/lib/theme";
import { formatCurrency, initials } from "@/lib/utils";
import type { Json } from "@/types/database";

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function socialValue(socials: Json, key: string) {
  if (!socials || typeof socials !== "object" || Array.isArray(socials)) {
    return null;
  }
  const value = socials[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function configFromData(
  data: NonNullable<Awaited<ReturnType<typeof getPublicBookingData>>>,
): BookingConfig {
  const categoryMap = new Map(
    data.categories.map((category) => [category.id, category.name]),
  );

  const services: BookingService[] = data.services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price),
    durationMinutes: service.duration_minutes,
    color: service.color,
    categoryId: service.category_id,
    categoryName: service.category_id
      ? (categoryMap.get(service.category_id) ?? "Servicios")
      : "Otros servicios",
  }));

  const location =
    [data.organization.address, data.organization.city]
      .filter(Boolean)
      .join(", ") || null;

  return {
    slug: data.organization.slug,
    businessName: data.organization.name,
    location,
    timezone: data.organization.timezone,
    currency: data.organization.currency,
    minDate: data.minDate,
    maxDate: data.maxDate,
    policyText: data.settings.policy_text,
    confirmationMode: data.settings.confirmation_mode,
    allowEmployeeSelection: data.settings.allow_employee_selection,
    showEmployees: data.settings.show_employees,
    showPrices: data.settings.show_prices,
    services,
    employees: data.employees.map((employee) => ({
      id: employee.id,
      name: employee.full_name,
      position: employee.position,
      photoUrl: employee.photo_url,
    })),
    employeeServices: data.employeeServices.map((link) => ({
      employeeId: link.employee_id,
      serviceId: link.service_id,
    })),
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/reservar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const seo = await getPublicOrganizationSeo(slug);

  if (!seo) {
    return { title: "Reservar una cita" };
  }

  const title = seo.title ?? `Reservar cita en ${seo.name}`;
  const description =
    seo.description ??
    `Reserva en línea tu próxima cita en ${seo.name}${seo.city ? `, ${seo.city}` : ""}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: seo.coverUrl ? [{ url: seo.coverUrl }] : undefined,
      type: "website",
    },
  } satisfies Metadata;
}

export default function PublicBookingPage({
  params,
}: PageProps<"/reservar/[slug]">) {
  return (
    <Suspense fallback={<PublicPageSkeleton />}>
      <PublicPageContent params={params} />
    </Suspense>
  );
}

async function PublicPageContent({
  params,
}: {
  params: PageProps<"/reservar/[slug]">["params"];
}) {
  const { slug } = await params;
  const data = await getPublicBookingData(slug);

  if (!data) notFound();

  const { organization, settings } = data;
  const config = configFromData(data);
  const categoryGroups = new Map<
    string,
    { name: string; color: string; services: typeof data.services }
  >();

  for (const service of data.services) {
    const category = data.categories.find(
      (item) => item.id === service.category_id,
    );
    const key = service.category_id ?? "otros";
    const entry = categoryGroups.get(key) ?? {
      name: category?.name ?? "Otros servicios",
      color: category?.color ?? service.color,
      services: [],
    };
    entry.services.push(service);
    categoryGroups.set(key, entry);
  }

  const todayWeekday = new Date().getDay();
  const location = config.location;
  const instagram = socialValue(settings.socials, "instagram");
  const whatsapp = socialValue(settings.socials, "whatsapp");
  const facebook = socialValue(settings.socials, "facebook");
  const forceDark =
    settings.public_theme === "dark" && settings.dark_mode_enabled;

  return (
    <PublicBookingProvider config={config}>
      <style
        dangerouslySetInnerHTML={{
          __html: themeCss(
            settings.brand_primary,
            settings.brand_secondary,
            settings.brand_accent,
          ),
        }}
      />
      <div className={forceDark ? "dark" : undefined}>
        <div className="min-h-dvh bg-background">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
              <Link
                href={`/reservar/${organization.slug}`}
                className="flex min-w-0 items-center gap-2.5"
              >
                <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  {organization.logo_url ? (
                    <Image
                      src={organization.logo_url}
                      alt={organization.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    initials(organization.name)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {organization.name}
                  </span>
                  {organization.city ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {organization.city}
                    </span>
                  ) : null}
                </span>
              </Link>

              <div className="flex items-center gap-1.5">
                <nav className="hidden items-center gap-1 md:flex">
                  <Button asChild variant="ghost" size="sm">
                    <a href="#servicios">Servicios</a>
                  </Button>
                  {settings.show_employees ? (
                    <Button asChild variant="ghost" size="sm">
                      <a href="#equipo">Equipo</a>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost" size="sm">
                    <a href="#horario">Horario</a>
                  </Button>
                  {settings.dark_mode_enabled ? <ThemeToggle /> : null}
                </nav>
                <OpenBookingButton size="sm" className="hidden sm:inline-flex">
                  Reservar
                </OpenBookingButton>
              </div>
            </div>
          </header>

          <section className="relative isolate overflow-hidden bg-slate-950 text-white">
            {organization.cover_url || settings.public_hero_url ? (
              <Image
                src={
                  settings.public_hero_url ??
                  organization.cover_url ??
                  ""
                }
                alt={organization.name}
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-55"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/70 to-slate-900/20" />
            <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
              <div className="max-w-2xl">
                <Badge className="border-white/20 bg-white/10 text-white">
                  <Sparkles className="size-3" />
                  Reserva en línea
                </Badge>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                  {organization.name}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                  {settings.public_about ??
                    organization.description ??
                    "Reserva tu próxima cita de forma rápida y sencilla."}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <OpenBookingButton size="lg">
                    Reservar cita
                  </OpenBookingButton>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                  >
                    <a href="#servicios">
                      Ver servicios <ArrowRight />
                    </a>
                  </Button>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70">
                  {location ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {location}
                    </span>
                  ) : null}
                  {organization.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3.5" /> {organization.phone}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="size-3.5" />
                    {settings.confirmation_mode === "automatic"
                      ? "Confirmación inmediata"
                      : "Confirmación por parte del negocio"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-3 sm:grid-cols-3">
              <Feature
                icon={CalendarDays}
                title="Reserva 24/7"
                text="Elige el horario que mejor te funcione desde cualquier dispositivo."
              />
              <Feature
                icon={CheckCircle2}
                title={
                  settings.confirmation_mode === "automatic"
                    ? "Confirmación inmediata"
                    : "Revisión del negocio"
                }
                text={
                  settings.confirmation_mode === "automatic"
                    ? "Tu cita queda confirmada al instante, sin esperas."
                    : "Recibirás la confirmación del negocio por correo."
                }
              />
              <Feature
                icon={Clock3}
                title={`Aviso mínimo de ${Math.round(settings.min_notice_minutes / 60)} h`}
                text="Los horarios se ajustan automáticamente a la agenda real."
              />
            </div>

            {settings.public_about || organization.description ? (
              <section className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Sobre nosotros
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Un espacio pensado para ti
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {organization.description ??
                      settings.public_about ??
                      "Conoce nuestros servicios y reserva con el profesional que prefieras."}
                  </p>
                  {location ? (
                    <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{location}</p>
                        {organization.country ? (
                          <p className="text-xs text-muted-foreground">
                            {organization.country}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat value={`${data.services.length}`} label="Servicios" />
                  <Stat value={`${data.employees.length}`} label="Profesionales" />
                  <Stat
                    value={`${settings.max_advance_days}`}
                    label="Días de anticipación"
                  />
                  <Stat
                    value={`${Math.round(settings.min_notice_minutes / 60)} h`}
                    label="Aviso mínimo"
                  />
                </div>
              </section>
            ) : null}

            <section id="servicios" className="mt-16 scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Catálogo
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Nuestros servicios
                  </h2>
                </div>
                <OpenBookingButton size="sm" variant="outline">
                  Reservar ahora
                </OpenBookingButton>
              </div>

              {data.services.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Este negocio aún no tiene servicios disponibles en línea.
                </div>
              ) : (
                <div className="mt-6 space-y-10">
                  {Array.from(categoryGroups.values()).map((group) => (
                    <div key={group.name}>
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <h3 className="text-sm font-semibold">{group.name}</h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.services.map((service) => (
                          <article
                            key={service.id}
                            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
                          >
                            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                              {service.image_url ? (
                                <Image
                                  src={service.image_url}
                                  alt={service.name}
                                  fill
                                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center">
                                  <Sparkles
                                    className="size-7"
                                    style={{ color: service.color }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                              <h4 className="font-medium">{service.name}</h4>
                              {service.description ? (
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {service.description}
                                </p>
                              ) : null}
                              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock3 className="size-3.5" />
                                  {service.duration_minutes} min
                                </span>
                                {settings.show_prices ? (
                                  <span className="font-semibold text-foreground">
                                    {formatCurrency(
                                      Number(service.price),
                                      organization.currency,
                                    )}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-4 flex-1" />
                              <BookService serviceId={service.id} />
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {settings.show_employees && data.employees.length > 0 ? (
              <section id="equipo" className="mt-16 scroll-mt-24">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                  Equipo
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Quiénes te atenderán
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {data.employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                          {employee.photo_url ? (
                            <Image
                              src={employee.photo_url}
                              alt={employee.full_name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            initials(employee.full_name)
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {employee.full_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {employee.position ?? "Profesional"}
                          </p>
                        </div>
                      </div>
                      {employee.bio ? (
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {employee.bio}
                        </p>
                      ) : null}
                      {employee.specialties.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {employee.specialties.slice(0, 3).map((item) => (
                            <Badge key={item} variant="muted" className="text-[10px]">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section id="horario" className="mt-16 scroll-mt-24">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    <h2 className="text-lg font-semibold">Horario de atención</h2>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm">
                    {data.businessHours.length === 0 ? (
                      <p className="text-muted-foreground">
                        Consulta el horario por teléfono.
                      </p>
                    ) : (
                      data.businessHours.map((row) => (
                        <div
                          key={row.id}
                          className={
                            row.weekday === todayWeekday
                              ? "flex items-center justify-between rounded-md bg-accent/60 px-2 py-1 font-medium"
                              : "flex items-center justify-between px-2 py-1"
                          }
                        >
                          <span
                            className={
                              row.weekday === todayWeekday
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {WEEKDAYS[row.weekday]}
                          </span>
                          <span>
                            {row.is_open
                              ? `${row.open_time.slice(0, 5)} – ${row.close_time.slice(0, 5)}`
                              : "Cerrado"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {settings.policy_text ? (
                    <>
                      <Separator className="my-5" />
                      <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Star className="mt-0.5 size-3.5 shrink-0 text-brand-accent" />
                        {settings.policy_text}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <h2 className="text-lg font-semibold">Contacto</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {location ? (
                      <p className="flex items-start gap-2.5">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span>{location}</span>
                      </p>
                    ) : null}
                    {organization.phone ? (
                      <a
                        href={`tel:${organization.phone.replace(/\s/g, "")}`}
                        className="flex items-center gap-2.5 hover:text-primary"
                      >
                        <Phone className="size-4 shrink-0 text-muted-foreground" />
                        {organization.phone}
                      </a>
                    ) : null}
                    {organization.email ? (
                      <a
                        href={`mailto:${organization.email}`}
                        className="flex items-center gap-2.5 hover:text-primary"
                      >
                        <Mail className="size-4 shrink-0 text-muted-foreground" />
                        {organization.email}
                      </a>
                    ) : null}
                  </div>

                  {instagram || facebook || whatsapp ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {instagram ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={instagram}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            <Camera /> Instagram
                          </a>
                        </Button>
                      ) : null}
                      {whatsapp ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            <MessageCircle /> WhatsApp
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-6 rounded-lg bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">
                      ¿Necesitas ayuda con tu reserva?
                    </p>
                    <p className="mt-1">
                      Escríbenos y con gusto te ayudamos a encontrar el mejor
                      horario.
                    </p>
                    <OpenBookingButton size="sm" className="mt-3">
                      Reservar cita
                    </OpenBookingButton>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <footer className="border-t border-border bg-card">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
              <p>
                © {new Date().getFullYear()} {organization.name}. Reservas
                gestionadas con{" "}
                <Link href="/" className="font-medium text-primary hover:underline">
                  AgendaPro
                </Link>
                .
              </p>
              <Link href="/login" className="hover:text-foreground">
                Acceso al panel
              </Link>
            </div>
          </footer>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
            <OpenBookingButton className="w-full">
              Reservar cita
            </OpenBookingButton>
          </div>
        </div>
      </div>
    </PublicBookingProvider>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CalendarDays;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function BookService({ serviceId }: { serviceId: string }) {
  return (
    <BookServiceButtonWrapper serviceId={serviceId} />
  );
}

// Se importa aparte para mantener el botón como límite cliente dentro del
// árbol de servidor sin convertir la tarjeta completa en Client Component.
import { BookServiceButton as BookServiceButtonWrapper } from "@/features/public-booking/booking-provider";

function PublicPageSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="h-16 border-b border-border">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-[460px] w-full rounded-none" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

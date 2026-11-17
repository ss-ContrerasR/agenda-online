"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  MapPin,
  Scissors,
  Search,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicOrganizationCard } from "@/features/public-booking/queries";
import { initials } from "@/lib/utils";

const ALL = "all";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function BusinessDirectory({
  organizations,
}: {
  organizations: PublicOrganizationCard[];
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(ALL);
  const [category, setCategory] = useState(ALL);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          organizations
            .map((organization) => organization.city)
            .filter((value): value is string => Boolean(value?.trim())),
        ),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [organizations],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(organizations.flatMap((organization) => organization.categories)),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [organizations],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return organizations.filter((organization) => {
      if (city !== ALL && organization.city !== city) return false;
      if (category !== ALL && !organization.categories.includes(category)) {
        return false;
      }
      if (!normalizedQuery) return true;

      return normalize(
        [
          organization.name,
          organization.description ?? "",
          organization.city ?? "",
          ...organization.categories,
        ].join(" "),
      ).includes(normalizedQuery);
    });
  }, [organizations, query, city, category]);

  const hasFilters = query.trim() !== "" || city !== ALL || category !== ALL;

  function clearFilters() {
    setQuery("");
    setCity(ALL);
    setCategory(ALL);
  }

  return (
    <section aria-label="Directorio de negocios">
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_220px]">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, ciudad o servicio"
              aria-label="Buscar negocios"
              className="pl-9"
            />
          </div>

          <Select value={city} onValueChange={setCity}>
            <SelectTrigger aria-label="Filtrar por ciudad">
              <SelectValue placeholder="Todas las ciudades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las ciudades</SelectItem>
              {cities.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filtrar por categoría">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las categorías</SelectItem>
              {categories.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "negocio" : "negocios"}
            {hasFilters ? " que coinciden con tu búsqueda" : " disponibles"}
          </p>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">No encontramos negocios</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Prueba con otro nombre, ciudad o categoría.
          </p>
          {hasFilters ? (
            <Button variant="outline" size="sm" className="mt-5" onClick={clearFilters}>
              Ver todos los negocios
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((organization) => (
            <Link
              key={organization.id}
              href={`/reservar/${organization.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:outline-none"
            >
              <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-background text-base font-semibold shadow-sm">
                  {organization.logoUrl ? (
                    <Image
                      src={organization.logoUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    initials(organization.name)
                  )}
                </span>
                <Badge className="absolute top-3 right-3 border-white/20 bg-background/85 text-foreground backdrop-blur">
                  <Sparkles className="text-primary" />
                  Reservas en línea
                </Badge>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {organization.name}
                  </h3>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>

                {organization.city ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    {[organization.city, organization.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}

                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {organization.description ??
                    "Este negocio aún no ha agregado una descripción."}
                </p>

                {organization.categories.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {organization.categories.slice(0, 3).map((name) => (
                      <Badge key={name} variant="secondary" className="text-[10px]">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="flex-1" />

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Scissors className="size-3.5" />
                    {organization.serviceCount}{" "}
                    {organization.serviceCount === 1 ? "servicio" : "servicios"}
                  </span>
                  <span className="font-medium text-primary">
                    Ver sitio de reservas
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

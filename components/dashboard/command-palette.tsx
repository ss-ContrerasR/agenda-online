"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Loader2,
  Search,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: "appointment" | "client" | "service" | "employee";
  title: string;
  subtitle: string;
  href: string;
};

const ICONS = {
  appointment: CalendarDays,
  client: Users,
  service: Sparkles,
  employee: UserRound,
};

const QUICK_LINKS = [
  { label: "Nueva cita", href: "/dashboard/citas/nueva", icon: CalendarDays },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Servicios", href: "/dashboard/servicios", icon: Sparkles },
  { label: "Equipo", href: "/dashboard/empleados", icon: UserRound },
];

export function CommandPalette({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground sm:w-64"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar en el panel…</span>
        <span className="sm:hidden">Buscar…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <span className="kbd">Ctrl</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar clientes, citas, servicios…"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <div className="space-y-1">
                <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Accesos rápidos
                </p>
                {QUICK_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => navigate(link.href)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {link.label}
                      <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ) : results.length === 0 && !loading ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No encontramos resultados para “{query}”.
              </p>
            ) : (
              <div className="space-y-1">
                {results.map((result) => {
                  const Icon = ICONS[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.href}`}
                      type="button"
                      onClick={() => navigate(result.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent",
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {result.subtitle}
                        </span>
                      </span>
                      <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <span>Resultados de tu negocio</span>
            <span className="flex items-center gap-1">
              <span className="kbd">Esc</span> para cerrar
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {trigger ? <span className="hidden">{trigger}</span> : null}
    </>
  );
}

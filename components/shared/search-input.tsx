"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  placeholder = "Buscar…",
  param = "q",
  className,
}: {
  placeholder?: string;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(searchParams.get(param) ?? "");
  }, [searchParams, param]);

  useEffect(() => {
    const current = searchParams.get(param) ?? "";
    if (value === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set(param, value.trim());
      else params.delete(param);
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams, param]);

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

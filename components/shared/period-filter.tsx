"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIOD_OPTIONS } from "@/lib/date-range";

export function PeriodFilter({
  preset,
  from,
  to,
}: {
  preset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(value) => apply({ period: value })}>
        <SelectTrigger className="w-44" aria-label="Período">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(event) => setCustomFrom(event.target.value)}
            className="w-36"
            aria-label="Desde"
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(event) => setCustomTo(event.target.value)}
            className="w-36"
            aria-label="Hasta"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => apply({ period: "custom", from: customFrom, to: customTo })}
            disabled={pending || !customFrom || !customTo}
          >
            <CalendarRange className="size-4" />
            Aplicar
          </Button>
        </div>
      ) : null}

      {pending ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export function FilterSelect({
  param,
  options,
  placeholder,
  allLabel = "Todos",
  className,
  allowAll = true,
  value: controlled,
  onChange,
}: {
  param: string;
  options: FilterOption[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
  allowAll?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = controlled ?? searchParams.get(param) ?? (allowAll ? "all" : "");

  function update(value: string) {
    if (onChange) {
      onChange(value);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(param);
    else params.set(param, value);
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className={cn("relative w-full sm:w-auto", className)}>
      <Select value={current} onValueChange={update}>
        <SelectTrigger className="w-full sm:w-44" aria-label={placeholder}>
          <SelectValue placeholder={placeholder ?? "Filtrar"} />
        </SelectTrigger>
        <SelectContent>
          {allowAll ? <SelectItem value="all">{allLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending ? (
        <Loader2 className="absolute top-1/2 -right-6 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}

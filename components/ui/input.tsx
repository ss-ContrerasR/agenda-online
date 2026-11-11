import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9.5 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-[0_1px_1px_rgba(15,23,42,0.02)] transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

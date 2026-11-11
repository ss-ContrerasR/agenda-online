import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-[1.04]">
        <CalendarDays className="size-4.5" />
      </span>
      {!compact ? (
        <span className="text-[17px]">
          Agenda<span className="text-primary">Pro</span>
        </span>
      ) : null}
    </Link>
  );
}

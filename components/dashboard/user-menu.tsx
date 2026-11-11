"use client";

import Link from "next/link";
import { LogOut, Settings, UserRound, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberRole } from "@/types/database";
import { initials } from "@/lib/utils";

export function UserMenu({
  name,
  email,
  avatarUrl,
  role,
  isPlatformAdmin,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: MemberRole;
  isPlatformAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-1.5"
          aria-label="Menú de usuario"
        >
          <Avatar className="size-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium xl:inline">
            {name.split(" ")[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-primary">
            {isPlatformAdmin ? <ShieldCheck className="size-3" /> : null}
            {ROLE_LABELS[role]}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/perfil">
            <UserRound /> Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/configuracion">
            <Settings /> Configuración
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

type ActionResult = { ok: boolean; error?: string; message?: string };

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  variant = "destructive",
  successMessage,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<ActionResult>;
  variant?: ButtonProps["variant"];
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        toast.success(successMessage ?? result.message ?? "Operación realizada");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "No se pudo completar la operación");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}
            className={
              variant === "default"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : undefined
            }
          >
            {pending ? "Procesando…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { Button };

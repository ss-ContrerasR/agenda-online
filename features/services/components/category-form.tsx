"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FolderPlus, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/features/services/actions";
import { initialActionState, type ActionResult } from "@/lib/errors";
import type { ServiceCategoryRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: {
  category?: ServiceCategoryRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    category ? updateCategoryAction : createCategoryAction,
    initialActionState as ActionResult,
  );

  useEffect(() => {
    if (!state.ok) {
      if (state.error && !state.fieldErrors) toast.error(state.error);
      return;
    }
    toast.success(state.message ?? "Categoría guardada");
    router.refresh();
    onSuccess?.();
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {category ? <input type="hidden" name="categoryId" value={category.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="category-name">Nombre *</Label>
        <Input
          id="category-name"
          name="name"
          required
          defaultValue={category?.name}
          placeholder="Ej. Cabello"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category-description">Descripción</Label>
        <Textarea
          id="category-description"
          name="description"
          rows={2}
          defaultValue={category?.description ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category-color">Color</Label>
          <Input
            id="category-color"
            name="color"
            type="color"
            defaultValue={category?.color ?? "#0F766E"}
            className="h-9.5 w-full p-1"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category-order">Orden</Label>
          <Input
            id="category-order"
            name="sort_order"
            type="number"
            min={0}
            max={999}
            defaultValue={category?.sort_order ?? 0}
          />
        </div>
      </div>
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : category ? (
            <Save className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {category ? "Guardar" : "Crear categoría"}
        </Button>
      </div>
    </form>
  );
}

export function CategoryFormDialog({ category }: { category?: ServiceCategoryRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="icon-sm" aria-label="Editar categoría">
            <FolderPlus className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <FolderPlus className="size-4" /> Nueva categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            Agrupa servicios para organizar el catálogo y la página pública.
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          category={category}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const result = await deleteCategoryAction(categoryId);
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Categoría eliminada");
      router.refresh();
    } else {
      toast.error(result.error ?? "No se pudo eliminar la categoría");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={remove}
      disabled={pending}
      aria-label="Eliminar categoría"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createOrganizationAction } from "../actions";
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "../schemas";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "../constants";
import { slugify } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function CreateOrganizationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      city: "",
      timezone: "America/Bogota",
      currency: "COP",
      ownerEmail: "",
      ownerName: "",
      confirm: false,
    },
  });

  const name = form.watch("name");
  const slugTouched = form.formState.touchedFields.slug;

  useEffect(() => {
    if (!slugTouched && name) {
      form.setValue("slug", slugify(name), { shouldValidate: false });
    }
  }, [name, slugTouched, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await createOrganizationAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "No se pudo crear la empresa.");
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof CreateOrganizationInput, { message });
        }
      }
      return;
    }
    toast.success(result.message ?? "Empresa creada correctamente.");
    setOpen(false);
    form.reset();
    router.refresh();
    const id =
      typeof result.data === "object" && result.data && "id" in result.data
        ? String(result.data.id)
        : null;
    if (id) router.push(`/admin/empresas/${id}`);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nueva empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear empresa</DialogTitle>
          <DialogDescription>
            Se creará la empresa con su configuración inicial. Opcionalmente puedes
            crear al propietario que administrará el negocio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-name">Nombre de la empresa *</Label>
              <Input id="org-name" {...form.register("name")} placeholder="Salón Bella" />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-slug">Identificador público *</Label>
              <Input id="org-slug" {...form.register("slug")} placeholder="salon-bella" />
              <p className="text-[11px] text-muted-foreground">
                URL: /reservar/{form.watch("slug") || "tu-empresa"}
              </p>
              <FieldError message={form.formState.errors.slug?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-email">Correo de contacto</Label>
              <Input id="org-email" type="email" {...form.register("email")} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-phone">Teléfono</Label>
              <Input id="org-phone" {...form.register("phone")} placeholder="+57 300 123 4567" />
              <FieldError message={form.formState.errors.phone?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-city">Ciudad</Label>
              <Input id="org-city" {...form.register("city")} />
              <FieldError message={form.formState.errors.city?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-timezone">Zona horaria *</Label>
              <Select
                value={form.watch("timezone")}
                onValueChange={(value) => form.setValue("timezone", value, { shouldValidate: true })}
              >
                <SelectTrigger id="org-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={form.formState.errors.timezone?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-currency">Moneda *</Label>
              <Select
                value={form.watch("currency")}
                onValueChange={(value) =>
                  form.setValue("currency", value as CreateOrganizationInput["currency"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="org-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={form.formState.errors.currency?.message} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Propietario (opcional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="owner-name">Nombre</Label>
                <Input id="owner-name" {...form.register("ownerName")} />
                <FieldError message={form.formState.errors.ownerName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-email">Correo electrónico</Label>
                <Input id="owner-email" type="email" {...form.register("ownerEmail")} />
                <FieldError message={form.formState.errors.ownerEmail?.message} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Se creará una cuenta con acceso confirmado y el rol de propietario.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={form.watch("confirm")}
              onCheckedChange={(checked) =>
                form.setValue("confirm", checked === true, { shouldValidate: true })
              }
              className="mt-0.5"
            />
            <span>
              Confirmo que los datos son correctos y deseo crear la empresa.
              <FieldError message={form.formState.errors.confirm?.message} />
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Crear empresa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

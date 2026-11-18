"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import {
  addMemberByEmailAction,
  createUserAction,
  removeMemberAction,
  setMemberActiveAction,
  updateMemberRoleAction,
} from "@/features/members/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { InfoHint } from "@/components/shared/info-hint";
import { initialActionState } from "@/lib/errors";
import { ROLE_LABELS } from "@/lib/permissions";
import type { MemberRole } from "@/types/database";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROLES: MemberRole[] = ["owner", "admin", "receptionist", "employee"];

type FieldErrors = Record<string, string>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function ErrorNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  );
}

/**
 * El envío se hace de forma explícita (FormData + Server Action) en lugar de
 * delegarlo a useActionState. Así el formulario funciona igual aunque esté
 * dentro de un Dialog con Tabs, y siempre mostramos el resultado: antes, un
 * error con fieldErrors no producía toast y parecía que no se enviaba nada.
 */
export function AddMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("existing");
  const [inviteRole, setInviteRole] = useState<MemberRole>("receptionist");
  const [createRole, setCreateRole] = useState<MemberRole>("receptionist");
  const [inviteErrors, setInviteErrors] = useState<FieldErrors>({});
  const [createErrors, setCreateErrors] = useState<FieldErrors>({});
  const [inviteError, setInviteError] = useState("");
  const [createError, setCreateError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [submitting, startTransition] = useTransition();
  const inviteFormRef = useRef<HTMLFormElement>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  function resetState() {
    setInviteErrors({});
    setCreateErrors({});
    setInviteError("");
    setCreateError("");
    setTemporaryPassword("");
    inviteFormRef.current?.reset();
    createFormRef.current?.reset();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetState();
  }

  function handleTabChange(next: string) {
    setTab(next);
    setInviteError("");
    setCreateError("");
  }

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // El Select de Radix no es un control nativo: el rol viaja en un hidden,
    // pero lo fijamos aquí también para que nunca llegue vacío al servidor.
    formData.set("role", inviteRole);
    setInviteErrors({});
    setInviteError("");

    startTransition(async () => {
      try {
        const result = await addMemberByEmailAction(initialActionState, formData);
        if (!result.ok) {
          setInviteErrors(result.fieldErrors ?? {});
          const message = result.error ?? "No se pudo agregar el usuario.";
          setInviteError(message);
          toast.error(message);
          return;
        }
        toast.success(result.message ?? "Miembro agregado");
        setOpen(false);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo agregar el usuario.";
        setInviteError(message);
        toast.error(message);
      }
    });
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("role", createRole);
    setCreateErrors({});
    setCreateError("");
    setTemporaryPassword("");

    startTransition(async () => {
      try {
        const result = await createUserAction(initialActionState, formData);
        if (!result.ok) {
          setCreateErrors(result.fieldErrors ?? {});
          const message = result.error ?? "No se pudo crear el usuario.";
          setCreateError(message);
          toast.error(message);
          return;
        }
        const password =
          result.data && typeof result.data === "object"
            ? String(
                (result.data as { temporaryPassword?: string }).temporaryPassword ??
                  "",
              )
            : "";
        setTemporaryPassword(password);
        toast.success(result.message ?? "Usuario creado");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo crear el usuario.";
        setCreateError(message);
        toast.error(message);
      }
    });
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success("Contraseña copiada al portapapeles");
    } catch {
      toast.error("Selecciona y copia la contraseña manualmente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Agregar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar usuario al equipo</DialogTitle>
          <DialogDescription>
            Vincula una cuenta existente o crea una nueva con una contraseña temporal.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Usuario existente</TabsTrigger>
            <TabsTrigger value="new">Crear nuevo</TabsTrigger>
          </TabsList>

          <TabsContent value="existing">
            <form
              ref={inviteFormRef}
              onSubmit={handleInviteSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="role" value={inviteRole} />
              <div className="space-y-1.5">
                <Label htmlFor="member-email" className="flex items-center gap-1.5">
                  Correo electrónico *
                  <InfoHint content="Debe coincidir con el correo de una cuenta ya registrada en la plataforma." />
                </Label>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  required
                  placeholder="nombre@ejemplo.com"
                  aria-invalid={Boolean(inviteErrors.email)}
                />
                <FieldError message={inviteErrors.email} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Rol en la organización
                  <InfoHint content="Propietario, administrador, recepcionista o empleado. Define qué puede hacer cada persona en el panel." />
                </Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value as MemberRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {ROLE_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={inviteErrors.role} />
              </div>

              <ErrorNotice message={inviteError} />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {submitting ? "Enviando…" : "Agregar"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="new">
            {temporaryPassword ? (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-3 text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                  Usuario creado correctamente
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contraseña temporal (cópiala ahora; no se volverá a mostrar):
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono select-all">
                    {temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={copyPassword}
                    aria-label="Copiar contraseña"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button type="button" size="sm" onClick={() => handleOpenChange(false)}>
                    Listo
                  </Button>
                </div>
              </div>
            ) : null}

            <form
              ref={createFormRef}
              onSubmit={handleCreateSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="role" value={createRole} />
              <div className="space-y-1.5">
                <Label htmlFor="new-user-name" className="flex items-center gap-1.5">
                  Nombre completo *
                  <InfoHint content="Nombre y apellido que verán los clientes y compañeros en la agenda." />
                </Label>
                <Input
                  id="new-user-name"
                  name="fullName"
                  required
                  placeholder="Andrea López"
                  aria-invalid={Boolean(createErrors.fullName)}
                />
                <FieldError message={createErrors.fullName} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-email">Correo electrónico *</Label>
                  <Input
                    id="new-user-email"
                    name="email"
                    type="email"
                    required
                    placeholder="andrea@negocio.com"
                    aria-invalid={Boolean(createErrors.email)}
                  />
                  <FieldError message={createErrors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-phone">Teléfono (opcional)</Label>
                  <Input id="new-user-phone" name="phone" placeholder="+57 300 555 0000" />
                  <FieldError message={createErrors.phone} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    Rol *
                    <InfoHint content="Propietario, administrador, recepcionista o empleado. Podrás cambiarlo después." />
                  </Label>
                  <Select
                    value={createRole}
                    onValueChange={(value) => setCreateRole(value as MemberRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {ROLE_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={createErrors.role} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-password" className="flex items-center gap-1.5">
                    Contraseña temporal
                    <InfoHint content="Déjala vacía para generarla automáticamente. Mínimo 8 caracteres si la escribes." />
                  </Label>
                  <Input
                    id="new-user-password"
                    name="password"
                    type="text"
                    autoComplete="off"
                    placeholder="Se genera automáticamente"
                    aria-invalid={Boolean(createErrors.password)}
                  />
                  <FieldError message={createErrors.password} />
                </div>
              </div>
              {createRole === "employee" ? (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <InfoHint content="Las cuentas con rol Empleado solo ven sus propias citas y notificaciones." />
                  <p className="text-muted-foreground">
                    La cuenta se crea aquí. Después agrégala al equipo desde{" "}
                    <Link
                      href="/dashboard/empleados"
                      className="font-medium text-primary hover:underline"
                    >
                      Equipo → Agregar personal
                    </Link>{" "}
                    para asignarle servicios y citas.
                  </p>
                </div>
              ) : null}

              <ErrorNotice message={createError} />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {submitting ? "Creando…" : "Crear usuario"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function MemberRoleSelect({
  membershipId,
  role,
  disabled,
}: {
  membershipId: string;
  role: MemberRole;
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState(role);
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    const next = value as MemberRole;
    setCurrent(next);
    startTransition(async () => {
      const result = await updateMemberRoleAction(membershipId, next);
      if (result.ok) {
        toast.success(result.message ?? "Rol actualizado");
      } else {
        setCurrent(role);
        toast.error(result.error ?? "No se pudo actualizar el rol");
      }
    });
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled || pending}>
      <SelectTrigger className="h-8 w-36 text-xs" aria-label="Rol del miembro">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((item) => (
          <SelectItem key={item} value={item}>
            {ROLE_LABELS[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ToggleMemberActiveButton({
  membershipId,
  isActive,
  name,
}: {
  membershipId: string;
  isActive: boolean;
  name: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isActive ? "Desactivar miembro" : "Reactivar miembro"}
        >
          {isActive ? (
            <UserMinus className="size-4" />
          ) : (
            <RotateCcw className="size-4" />
          )}
        </Button>
      }
      title={isActive ? "Desactivar miembro" : "Reactivar miembro"}
      description={
        isActive
          ? `${name} perderá el acceso al panel mientras esté desactivado.`
          : `${name} volverá a tener acceso al panel.`
      }
      confirmLabel={isActive ? "Desactivar" : "Reactivar"}
      variant={isActive ? "destructive" : "default"}
      onConfirm={() => setMemberActiveAction(membershipId, !isActive)}
    />
  );
}

export function RemoveMemberButton({
  membershipId,
  name,
}: {
  membershipId: string;
  name: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Eliminar miembro"
        >
          <Trash2 className="size-4" />
        </Button>
      }
      title="Eliminar miembro"
      description={`${name} dejará de pertenecer a esta organización. Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      onConfirm={() => removeMemberAction(membershipId)}
    />
  );
}

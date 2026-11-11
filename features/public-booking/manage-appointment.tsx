"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Scissors,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  cancelPublicAppointmentAction,
  loadRescheduleSlotsAction,
  reschedulePublicAppointmentAction,
} from "@/features/public-booking/actions";
import type {
  PublicAppointmentDetails,
  PublicSlot,
  SlotsPayload,
} from "@/features/public-booking/types";
import { groupSlotsByPeriod } from "@/lib/availability";
import {
  cn,
  formatCurrency,
  formatDateInTz,
  formatTimeInTz,
} from "@/lib/utils";

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function ManageAppointment({
  details,
  minDate,
  maxDate,
}: {
  details: PublicAppointmentDetails;
  minDate: string;
  maxDate: string;
}) {
  const { appointment, organization, settings, service, employee } = details;
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, startCancel] = useTransition();

  const startsAt = new Date(appointment.starts_at);
  const now = Date.now();
  const active = appointment.status === "pending" || appointment.status === "confirmed";
  const started = startsAt.getTime() <= now;
  const cancelDeadline =
    startsAt.getTime() - settings.cancellation_notice_hours * 3_600_000;
  const rescheduleDeadline =
    startsAt.getTime() - settings.reschedule_notice_hours * 3_600_000;

  const canCancel =
    active &&
    !started &&
    (settings.cancellation_notice_hours === 0 || now <= cancelDeadline);
  const canReschedule =
    active &&
    !started &&
    (settings.reschedule_notice_hours === 0 || now <= rescheduleDeadline);

  const durationMinutes = appointment.duration_minutes;

  function confirmCancel() {
    startCancel(async () => {
      const result = await cancelPublicAppointmentAction({
        slug: organization.slug,
        token: appointment.public_token,
        reason: reason.trim() || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Tu cita fue cancelada.");
      setCancelOpen(false);
      setReason("");
      router.refresh();
    });
  }

  const statusNote = (() => {
    if (appointment.status === "cancelled") {
      return appointment.cancellation_reason
        ? `Motivo: ${appointment.cancellation_reason}`
        : "Esta cita fue cancelada.";
    }
    if (appointment.status === "completed") {
      return "Esta cita ya se completó. ¡Gracias por tu visita!";
    }
    if (appointment.status === "no_show") {
      return "Esta cita quedó registrada como no asistida.";
    }
    if (started) return "Esta cita ya pasó.";
    if (!canCancel && settings.cancellation_notice_hours > 0) {
      return `Ya pasó el plazo para cancelar en línea (${settings.cancellation_notice_hours} h antes). Contacta al negocio.`;
    }
    if (!canReschedule && settings.reschedule_notice_hours > 0) {
      return `Ya pasó el plazo para reprogramar en línea (${settings.reschedule_notice_hours} h antes).`;
    }
    return null;
  })();

  const gcalUrl = useMemo(() => {
    const start = new Date(appointment.starts_at);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const toParam = (value: Date) =>
      value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${service.name} · ${organization.name}`,
      dates: `${toParam(start)}/${toParam(end)}`,
      details: `Cita con ${employee.full_name} en ${organization.name}.`,
      location: [organization.address, organization.city]
        .filter(Boolean)
        .join(", "),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [appointment.starts_at, durationMinutes, employee.full_name, organization, service.name]);

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              {active ? "Tu próxima cita" : "Cita"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {service.name}
            </h1>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail
            icon={CalendarDays}
            label="Fecha"
            value={
              <span className="capitalize">
                {formatDateInTz(
                  appointment.starts_at,
                  organization.timezone,
                  "EEEE d 'de' MMMM 'de' yyyy",
                )}
              </span>
            }
          />
          <Detail
            icon={Clock3}
            label="Hora"
            value={`${formatTimeInTz(appointment.starts_at, organization.timezone)} · ${durationMinutes} min`}
          />
          <Detail icon={UserRound} label="Profesional" value={employee.full_name} />
          <Detail
            icon={Scissors}
            label="Precio"
            value={formatCurrency(Number(appointment.price), organization.currency)}
          />
          {organization.address || organization.city ? (
            <Detail
              icon={MapPin}
              label="Dirección"
              value={[organization.address, organization.city]
                .filter(Boolean)
                .join(", ")}
            />
          ) : null}
          {appointment.notes ? (
            <Detail
              icon={AlertTriangle}
              label="Notas"
              value={appointment.notes}
              className="sm:col-span-2"
            />
          ) : null}
        </div>

        {statusNote ? (
          <div
            className={cn(
              "mt-5 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm",
              appointment.status === "cancelled" || appointment.status === "no_show"
                ? "border-destructive/25 bg-destructive/5 text-destructive"
                : "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300",
            )}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{statusNote}</span>
          </div>
        ) : null}

        {active && !started ? (
          <>
            <Separator className="my-5" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => setRescheduleOpen(true)}
                disabled={!canReschedule}
                className="flex-1"
              >
                <RefreshCw /> Reprogramar cita
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelOpen(true)}
                disabled={!canCancel}
                className="flex-1"
              >
                <XCircle /> Cancelar cita
              </Button>
            </div>
            {settings.cancellation_notice_hours > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Puedes cancelar hasta {settings.cancellation_notice_hours} horas
                antes del inicio. La reprogramación requiere{" "}
                {settings.reschedule_notice_hours} horas de anticipación.
              </p>
            ) : null}
          </>
        ) : appointment.status === "cancelled" ? (
          <>
            <Separator className="my-5" />
            <Button asChild className="w-full">
              <a href={`/reservar/${organization.slug}`}>Reservar de nuevo</a>
            </Button>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <span>
          Gestionado por{" "}
          <a
            href={`/reservar/${organization.slug}`}
            className="font-medium text-primary hover:underline"
          >
            {organization.name}
          </a>
        </span>
        {active ? (
          <a
            href={gcalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-primary hover:underline"
          >
            Añadir a Google Calendar
          </a>
        ) : null}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar tu cita</DialogTitle>
            <DialogDescription>
              Esta acción libera tu horario y no se puede deshacer. Si el
              negocio aplica una política de cancelación, puede cobrar un cargo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Cuéntanos por qué cancelas para ayudar al negocio."
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Conservar cita
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cancelling}
              onClick={confirmCancel}
            >
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        slug={organization.slug}
        token={appointment.public_token}
        timezone={organization.timezone}
        currency={organization.currency}
        serviceName={service.name}
        servicePrice={Number(appointment.price)}
        durationMinutes={durationMinutes}
        minDate={minDate}
        maxDate={maxDate}
        onSuccess={(token) => {
          router.push(`/reservar/${organization.slug}/cita/${token}`);
          router.refresh();
        }}
      />
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function RescheduleDialog({
  open,
  onOpenChange,
  slug,
  token,
  timezone,
  currency,
  serviceName,
  servicePrice,
  durationMinutes,
  minDate,
  maxDate,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  token: string;
  timezone: string;
  currency: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  minDate: string;
  maxDate: string;
  onSuccess: (token: string) => void;
}) {
  const [date, setDate] = useState(minDate);
  const [cursor, setCursor] = useState(minDate);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [employees, setEmployees] = useState<SlotsPayload["employees"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const loadSlots = useCallback(
    async (targetDate: string) => {
      setLoading(true);
      setError(null);
      setSelected(null);
      const result = await loadRescheduleSlotsAction({
        slug,
        token,
        date: targetDate,
      });
      if (result.ok) {
        setSlots(result.data.slots);
        setEmployees(result.data.employees);
      } else {
        setSlots([]);
        setError(result.error);
      }
      setLoading(false);
    },
    [slug, token],
  );

  useEffect(() => {
    if (!open) return;
    const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
    const initial = today > minDate ? today : minDate;
    setDate(initial);
    setCursor(initial);
    void loadSlots(initial);
  }, [open, minDate, timezone, loadSlots]);

  const days = Array.from({ length: 7 }, (_, index) => shiftDate(cursor, index));
  const canGoBack = cursor > minDate;
  const canGoForward = shiftDate(cursor, 7) <= maxDate;
  const grouped = useMemo(
    () => groupSlotsByPeriod(slots, timezone),
    [slots, timezone],
  );

  function chooseDate(nextDate: string) {
    setDate(nextDate);
    setCursor(nextDate);
    void loadSlots(nextDate);
  }

  function confirm() {
    if (!selected) return;
    startSaving(async () => {
      const result = await reschedulePublicAppointmentAction({
        slug,
        token,
        start: selected,
      });
      if (!result.ok) {
        toast.error(result.error);
        if (result.error.toLowerCase().includes("ocup")) {
          void loadSlots(date);
        }
        return;
      }
      toast.success("Tu cita fue reprogramada.");
      onOpenChange(false);
      onSuccess(result.data.token);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elegir un nuevo horario</DialogTitle>
          <DialogDescription>
            {serviceName} · {durationMinutes} min ·{" "}
            {formatCurrency(servicePrice, currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoBack}
              onClick={() => setCursor(shiftDate(cursor, -7))}
              aria-label="Semana anterior"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <p className="text-xs font-medium text-muted-foreground">
              {format(parse(cursor, "yyyy-MM-dd", new Date()), "MMMM yyyy", {
                locale: es,
              })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={!canGoForward}
              onClick={() => setCursor(shiftDate(cursor, 7))}
              aria-label="Semana siguiente"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const disabled = day < minDate || day > maxDate;
              const isSelected = day === date;
              const parsed = parse(day, "yyyy-MM-dd", new Date());
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => chooseDate(day)}
                  className={cn(
                    "flex flex-col items-center rounded-lg px-0.5 py-2 text-center transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-30",
                  )}
                >
                  <span className="text-[10px] uppercase opacity-80">
                    {WEEKDAY_SHORT[parsed.getDay()]}
                  </span>
                  <span className="text-sm font-semibold">
                    {parsed.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
            <Label htmlFor="reschedule-date" className="text-xs text-muted-foreground">
              Otra fecha
            </Label>
            <Input
              id="reschedule-date"
              type="date"
              className="h-8 w-auto flex-1 text-xs"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(event) => {
                if (event.target.value) chooseDate(event.target.value);
              }}
            />
          </div>
        </div>

        <div className="min-h-40">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Consultando
              disponibilidad…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <CalendarX2 className="size-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium">
                Sin horarios disponibles
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Prueba con otro día para encontrar un espacio disponible.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(
                [
                  ["morning", "Mañana"],
                  ["afternoon", "Tarde"],
                  ["evening", "Noche"],
                ] as const
              ).map(([key, label]) =>
                grouped[key].length > 0 ? (
                  <div key={key}>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      {grouped[key].map((slot) => (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setSelected(slot.start)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-center text-sm font-medium transition-colors",
                            selected === slot.start
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50 hover:bg-accent/40",
                          )}
                        >
                          {formatTimeInTz(slot.start, timezone)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" loading={saving} disabled={!selected} onClick={confirm}>
            {selected
              ? `Mover a ${formatTimeInTz(selected, timezone)}`
              : "Elige un horario"}
          </Button>
        </DialogFooter>

        {!loading && slots.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-primary" />
            {employees.length > 1
              ? "Tu cita se asignará al profesional disponible."
              : "Se mantiene el profesional actual."}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

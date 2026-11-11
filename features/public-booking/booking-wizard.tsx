"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency, formatTimeInTz, initials } from "@/lib/utils";
import { groupSlotsByPeriod } from "@/lib/availability";
import {
  bookingDetailsSchema,
} from "@/features/public-booking/schemas";
import {
  createPublicAppointmentAction,
  loadPublicSlotsAction,
} from "@/features/public-booking/actions";
import type {
  BookingResultData,
  PublicSlot,
  SlotsPayload,
} from "@/features/public-booking/types";

export type BookingService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  color: string;
  categoryId: string | null;
  categoryName: string;
};

export type BookingEmployee = {
  id: string;
  name: string;
  position: string | null;
  photoUrl: string | null;
};

export type BookingConfig = {
  slug: string;
  businessName: string;
  location: string | null;
  timezone: string;
  currency: string;
  minDate: string;
  maxDate: string;
  policyText: string | null;
  confirmationMode: "automatic" | "manual";
  allowEmployeeSelection: boolean;
  showEmployees: boolean;
  showPrices: boolean;
  services: BookingService[];
  employees: BookingEmployee[];
  employeeServices: Array<{ employeeId: string; serviceId: string }>;
};

type Step = 1 | 2 | 3 | 4 | 5;

type DetailsValues = z.infer<typeof bookingDetailsSchema>;

type SelectedSlot = {
  start: string;
  end: string;
  employeeId: string;
};

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: "Servicio" },
  { step: 2, label: "Profesional" },
  { step: 3, label: "Horario" },
  { step: 4, label: "Tus datos" },
  { step: 5, label: "Confirmar" },
];

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayLabel(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "d MMM", { locale: es });
}

function longDate(date: string) {
  return format(parse(date, "yyyy-MM-dd", new Date()), "EEEE d 'de' MMMM", {
    locale: es,
  });
}

function stepNumber(step: Step, current: Step) {
  if (step < current) return "done";
  if (step === current) return "current";
  return "todo";
}

export function BookingWizard({
  config,
  initialServiceId,
  onClose,
}: {
  config: BookingConfig;
  initialServiceId?: string | null;
  onClose: () => void;
}) {
  const initialService =
    config.services.find((service) => service.id === initialServiceId) ?? null;

  const [step, setStep] = useState<Step>(initialService ? 2 : 1);
  const [serviceId, setServiceId] = useState<string | null>(
    initialService?.id ?? null,
  );
  const [employeeId, setEmployeeId] = useState<string>("any");
  const [date, setDate] = useState(config.minDate);
  const [dateCursor, setDateCursor] = useState(config.minDate);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [slotEmployees, setSlotEmployees] = useState<SlotsPayload["employees"]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [details, setDetails] = useState<DetailsValues | null>(null);
  const [confirmation, setConfirmation] = useState<BookingResultData | null>(null);
  const [saving, startSaving] = useTransition();

  const service = useMemo(
    () => config.services.find((item) => item.id === serviceId) ?? null,
    [config.services, serviceId],
  );

  const eligibleEmployees = useMemo(() => {
    if (!serviceId) return [];
    const ids = new Set(
      config.employeeServices
        .filter((link) => link.serviceId === serviceId)
        .map((link) => link.employeeId),
    );
    return config.employees.filter((employee) => ids.has(employee.id));
  }, [config.employeeServices, config.employees, serviceId]);

  const canChooseEmployee =
    config.allowEmployeeSelection &&
    config.showEmployees &&
    eligibleEmployees.length > 1;

  const form = useForm<DetailsValues>({
    resolver: zodResolver(bookingDetailsSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      notes: "",
      policyAccepted: false,
    },
  });

  useEffect(() => {
    if (step !== 3 || !serviceId || !date) return;

    let active = true;
    setLoadingSlots(true);
    setSlotError(null);

    loadPublicSlotsAction({
      slug: config.slug,
      serviceId,
      employeeId: employeeId === "any" ? null : employeeId,
      date,
    })
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setSlots(result.data.slots);
          setSlotEmployees(result.data.employees);
        } else {
          setSlots([]);
          setSlotError(result.error);
        }
      })
      .catch(() => {
        if (!active) return;
        setSlots([]);
        setSlotError("No pudimos cargar los horarios. Intenta de nuevo.");
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [config.slug, date, employeeId, serviceId, step]);

  function chooseService(nextService: BookingService) {
    setServiceId(nextService.id);
    setEmployeeId("any");
    setSelectedSlot(null);
    const requiresEmployee =
      config.allowEmployeeSelection && config.showEmployees;
    const linkCount = config.employeeServices.filter(
      (link) => link.serviceId === nextService.id,
    ).length;
    setStep(requiresEmployee && linkCount > 1 ? 2 : 3);
  }

  function chooseEmployee(nextEmployee: string) {
    setEmployeeId(nextEmployee);
    setSelectedSlot(null);
    setStep(3);
  }

  function nextStep() {
    if (step === 1) {
      if (!service) return;
      const linkCount = config.employeeServices.filter(
        (link) => link.serviceId === service.id,
      ).length;
      setStep(
        config.allowEmployeeSelection && config.showEmployees && linkCount > 1
          ? 2
          : 3,
      );
      return;
    }
    setStep((step + 1) as Step);
  }

  function chooseDate(nextDate: string) {
    setDate(nextDate);
    setDateCursor(nextDate);
    setSelectedSlot(null);
  }

  function chooseSlot(slot: PublicSlot) {
    setSelectedSlot({
      start: slot.start,
      end: slot.end,
      employeeId:
        employeeId === "any" ? slot.employeeIds[0] : employeeId,
    });
    setStep(4);
  }

  function submitDetails(values: DetailsValues) {
    setDetails(values);
    setStep(5);
  }

  function confirm() {
    if (!service || !selectedSlot || !details) return;

    startSaving(async () => {
      const result = await createPublicAppointmentAction({
        slug: config.slug,
        serviceId: service.id,
        employeeId: employeeId === "any" ? null : employeeId,
        start: selectedSlot.start,
        fullName: details.fullName,
        email: details.email,
        phone: details.phone,
        notes: details.notes || undefined,
        policyAccepted: true,
      });

      if (!result.ok) {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            if (
              field === "fullName" ||
              field === "email" ||
              field === "phone" ||
              field === "notes" ||
              field === "policyAccepted"
            ) {
              form.setError(field, { message });
            }
          }
          setStep(4);
        }
        return;
      }

      setConfirmation(result.data);
    });
  }

  const employeeName =
    employeeId === "any"
      ? selectedSlot
        ? (slotEmployees.find((item) => item.id === selectedSlot.employeeId)
            ?.name ?? "Por asignar")
        : "Cualquier profesional"
      : (config.employees.find((item) => item.id === employeeId)?.name ??
        "Profesional");

  const grouped = useMemo(
    () => groupSlotsByPeriod(slots, config.timezone),
    [config.timezone, slots],
  );

  if (confirmation) {
    return (
      <ConfirmationView
        config={config}
        result={confirmation}
        service={service}
        employeeName={employeeName}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex max-h-[90dvh] flex-col">
      <div className="border-b border-border px-5 py-4 pr-12 sm:px-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarCheck2 className="size-4 text-primary" />
          Reserva en línea
        </div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">
          {service ? service.name : "Elige tu servicio"}
        </h2>
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((item, index) => {
            const state = stepNumber(item.step, step);
            const hidden =
              item.step === 2 &&
              (!config.allowEmployeeSelection || !config.showEmployees);
            if (hidden) return null;
            return (
              <div key={item.step} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="h-px w-3 bg-border sm:w-5" />
                ) : null}
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-[11px] font-medium whitespace-nowrap",
                    state === "current"
                      ? "bg-primary/10 text-primary"
                      : state === "done"
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-[10px]",
                      state === "current"
                        ? "border-primary bg-primary text-primary-foreground"
                        : state === "done"
                          ? "border-primary/30 bg-primary/10"
                          : "border-border",
                    )}
                  >
                    {state === "done" ? <Check className="size-3" /> : item.step}
                  </span>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_280px]">
        <div className="p-5 sm:p-6">
          {step === 1 ? (
            <ServiceStep
              config={config}
              serviceId={serviceId}
              onSelect={chooseService}
            />
          ) : null}

          {step === 2 ? (
            <EmployeeStep
              employees={eligibleEmployees}
              employeeId={employeeId}
              onSelect={chooseEmployee}
            />
          ) : null}

          {step === 3 ? (
            <ScheduleStep
              config={config}
              date={date}
              dateCursor={dateCursor}
              onDateCursorChange={setDateCursor}
              onDateChange={chooseDate}
              slots={grouped}
              slotEmployees={slotEmployees}
              loading={loadingSlots}
              error={slotError}
              selectedSlot={selectedSlot}
              onSlotSelect={chooseSlot}
            />
          ) : null}

          {step === 4 ? (
            <DetailsStep
              form={form}
              policyText={config.policyText}
              onSubmit={submitDetails}
            />
          ) : null}

          {step === 5 && details && service && selectedSlot ? (
            <ReviewStep
              config={config}
              service={service}
              employeeName={employeeName}
              date={date}
              slot={selectedSlot}
              details={details}
              onEditDetails={() => setStep(4)}
              onEditSchedule={() => setStep(3)}
            />
          ) : null}
        </div>

        <aside className="border-t border-border bg-muted/40 p-5 md:border-t-0 md:border-l">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Tu reserva
          </p>
          <div className="mt-4 space-y-3.5 text-sm">
            <SummaryLine
              icon={Sparkles}
              label="Servicio"
              value={service?.name ?? "Sin elegir"}
            />
            <SummaryLine
              icon={UserRound}
              label="Profesional"
              value={
                config.showEmployees
                  ? employeeId === "any" && !selectedSlot
                    ? "Cualquiera disponible"
                    : employeeName
                  : "Asignado por el negocio"
              }
            />
            <SummaryLine
              icon={CalendarDays}
              label="Fecha"
              value={selectedSlot ? longDate(date) : "Sin elegir"}
            />
            <SummaryLine
              icon={Clock3}
              label="Hora"
              value={
                selectedSlot
                  ? `${formatTimeInTz(selectedSlot.start, config.timezone)}${
                      service
                        ? ` · ${service.durationMinutes} min`
                        : ""
                    }`
                  : "Sin elegir"
              }
            />
          </div>

          {service && config.showPrices ? (
            <>
              <Separator className="my-4" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(service.price, config.currency)}
                </span>
              </div>
            </>
          ) : null}

          <div className="mt-5 rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <CalendarCheck2 className="size-3.5 text-primary" />
              {config.confirmationMode === "automatic"
                ? "Confirmación inmediata"
                : "Confirmación del negocio"}
            </p>
            <p className="mt-1">
              {config.confirmationMode === "automatic"
                ? "Tu cita queda confirmada al terminar la reserva."
                : "El negocio revisará tu solicitud y te confirmará por correo."}
            </p>
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (step === 1 ? onClose() : setStep((step - 1) as Step))}
        >
          {step === 1 ? "Cancelar" : <><ArrowLeft /> Atrás</>}
        </Button>

        {step === 4 ? (
          <Button
            type="submit"
            form="booking-details-form"
            disabled={!form.formState.isValid}
          >
            Revisar reserva <ArrowRight />
          </Button>
        ) : step === 5 ? (
          <Button type="button" onClick={confirm} loading={saving}>
            {saving ? "Confirmando…" : "Confirmar reserva"}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={
              (step === 1 && !service) ||
              (step === 2 && !employeeId) ||
              step === 3
            }
            onClick={nextStep}
          >
            Continuar <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

function ServiceStep({
  config,
  serviceId,
  onSelect,
}: {
  config: BookingConfig;
  serviceId: string | null;
  onSelect: (service: BookingService) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; services: BookingService[] }>();
    for (const service of config.services) {
      const key = service.categoryId ?? "otros";
      const name = service.categoryName || "Otros servicios";
      const entry = map.get(key) ?? { name, services: [] };
      entry.services.push(service);
      map.set(key, entry);
    }
    return Array.from(map.values());
  }, [config.services]);

  if (config.services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Este negocio aún no tiene servicios disponibles para reservar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">¿Qué servicio necesitas?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige una opción para ver la disponibilidad.
        </p>
      </div>
      {groups.map((group) => (
        <div key={group.name} className="space-y-2.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.name}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {group.services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelect(service)}
                className={cn(
                  "group rounded-xl border p-3.5 text-left transition-all",
                  serviceId === service.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{service.name}</p>
                    {service.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${service.color}18`,
                      color: service.color,
                    }}
                  >
                    <Scissors className="size-3.5" />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock3 className="size-3.5" /> {service.durationMinutes} min
                  </span>
                  {config.showPrices ? (
                    <span className="font-semibold">
                      {formatCurrency(service.price, config.currency)}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmployeeStep({
  employees,
  employeeId,
  onSelect,
}: {
  employees: BookingEmployee[];
  employeeId: string;
  onSelect: (employeeId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">¿Con quién prefieres tu cita?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Puedes elegir un profesional o dejar que asignemos al primero disponible.
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("any")}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
            employeeId === "any"
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border bg-card hover:border-primary/40",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium">Cualquier profesional</p>
            <p className="text-xs text-muted-foreground">
              Priorizamos la disponibilidad
            </p>
          </div>
        </button>

        {employees.map((employee) => (
          <button
            key={employee.id}
            type="button"
            onClick={() => onSelect(employee.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
              employeeId === employee.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <span
              className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground"
              style={
                employee.photoUrl
                  ? undefined
                  : { backgroundColor: "#0f766e18", color: "#0f766e" }
              }
            >
              {employee.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={employee.photoUrl}
                  alt={employee.name}
                  className="size-full object-cover"
                />
              ) : (
                initials(employee.name)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{employee.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {employee.position ?? "Profesional"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleStep({
  config,
  date,
  dateCursor,
  onDateCursorChange,
  onDateChange,
  slots,
  slotEmployees,
  loading,
  error,
  selectedSlot,
  onSlotSelect,
}: {
  config: BookingConfig;
  date: string;
  dateCursor: string;
  onDateCursorChange: (date: string) => void;
  onDateChange: (date: string) => void;
  slots: ReturnType<typeof groupSlotsByPeriod>;
  slotEmployees: SlotsPayload["employees"];
  loading: boolean;
  error: string | null;
  selectedSlot: SelectedSlot | null;
  onSlotSelect: (slot: PublicSlot) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(dateCursor, index));
  const prevCursor = shiftDate(dateCursor, -7);
  const nextCursor = shiftDate(dateCursor, 7);
  const canGoBack = dateCursor > config.minDate;
  const canGoForward = nextCursor <= config.maxDate;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Elige fecha y hora</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Disponibilidad en vivo según la agenda del negocio.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoBack}
            onClick={() => onDateCursorChange(prevCursor)}
            aria-label="Semana anterior"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <p className="text-xs font-medium text-muted-foreground">
            {format(parse(dateCursor, "yyyy-MM-dd", new Date()), "MMMM yyyy", {
              locale: es,
            })}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoForward}
            onClick={() => onDateCursorChange(nextCursor)}
            aria-label="Semana siguiente"
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const disabled = day < config.minDate || day > config.maxDate;
            const selected = day === date;
            const parsed = parse(day, "yyyy-MM-dd", new Date());
            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => onDateChange(day)}
                className={cn(
                  "flex flex-col items-center rounded-lg px-0.5 py-2 text-center transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                  disabled && "cursor-not-allowed opacity-30",
                )}
              >
                <span className="text-[10px] uppercase opacity-80">
                  {WEEKDAY_SHORT[parsed.getDay()]}
                </span>
                <span className="text-sm font-semibold">{parsed.getDate()}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          <Label htmlFor="booking-date" className="text-xs text-muted-foreground">
            Otra fecha
          </Label>
          <Input
            id="booking-date"
            type="date"
            className="h-8 w-auto flex-1 text-xs"
            value={date}
            min={config.minDate}
            max={config.maxDate}
            onChange={(event) => {
              if (event.target.value) onDateChange(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="min-h-44">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Consultando disponibilidad…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : slots.morning.length + slots.afternoon.length + slots.evening.length ===
          0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <CalendarDays className="size-6 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Sin horarios disponibles</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Prueba con otro día o elige otro profesional.
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
              slots[key].length > 0 ? (
                <div key={key}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {label}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {slots[key].map((slot) => {
                      const isSelected = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => onSlotSelect(slot)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-center transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50 hover:bg-accent/40",
                          )}
                        >
                          <span className="block text-sm font-medium">
                            {formatTimeInTz(slot.start, config.timezone)}
                          </span>
                          {slot.employeeIds.length > 1 ? (
                            <span
                              className={cn(
                                "mt-0.5 block text-[10px]",
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {slot.employeeIds.length} disponibles
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "mt-0.5 block truncate text-[10px]",
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {slotEmployees.find(
                                (employee) =>
                                  employee.id === slot.employeeIds[0],
                              )?.name ?? ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsStep({
  form,
  policyText,
  onSubmit,
}: {
  form: UseFormReturn<DetailsValues>;
  policyText: string | null;
  onSubmit: (values: DetailsValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form
      id="booking-details-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      <div>
        <h3 className="text-sm font-semibold">Tus datos de contacto</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Usaremos esta información para confirmar y recordar tu cita.
        </p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Ej. Mariana López"
            aria-invalid={Boolean(errors.fullName)}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              className="pl-9"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+57 300 000 0000"
              className="pl-9"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
          </div>
          {errors.phone ? (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notas para el negocio (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Alergias, preferencias o cualquier detalle que debamos saber."
            {...register("notes")}
          />
          {errors.notes ? (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          ) : null}
        </div>
      </div>

      {policyText ? (
        <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {policyText}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input accent-[var(--primary)]"
            aria-invalid={Boolean(errors.policyAccepted)}
            {...register("policyAccepted")}
          />
          <span className="text-sm leading-snug text-muted-foreground">
            Acepto la política de reserva y el tratamiento de mis datos para
            gestionar esta cita.
          </span>
        </label>
        {errors.policyAccepted ? (
          <p className="text-xs text-destructive">
            {errors.policyAccepted.message}
          </p>
        ) : null}
      </div>

      <button type="submit" className="hidden" aria-hidden="true" />
    </form>
  );
}

function ReviewStep({
  config,
  service,
  employeeName,
  date,
  slot,
  details,
  onEditDetails,
  onEditSchedule,
}: {
  config: BookingConfig;
  service: BookingService;
  employeeName: string;
  date: string;
  slot: SelectedSlot;
  details: DetailsValues;
  onEditDetails: () => void;
  onEditSchedule: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Revisa y confirma</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifica que todo esté correcto antes de reservar.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Servicio</p>
            <p className="mt-0.5 font-medium">{service.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {service.durationMinutes} minutos
              {config.showPrices
                ? ` · ${formatCurrency(service.price, config.currency)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Fecha y hora</p>
            <p className="mt-0.5 font-medium capitalize">{longDate(date)}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatTimeInTz(slot.start, config.timezone)} –{" "}
              {formatTimeInTz(slot.end, config.timezone)}
              {config.timezone ? ` (${config.timezone})` : ""}
            </p>
            {config.showEmployees ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <UserRound className="size-3.5" /> {employeeName}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onEditSchedule}>
            Cambiar
          </Button>
        </div>

        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Tus datos</p>
            <p className="mt-0.5 font-medium">{details.fullName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {details.email} · {details.phone}
            </p>
            {details.notes ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                “{details.notes}”
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onEditDetails}>
            Editar
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {config.confirmationMode === "automatic"
          ? "Al confirmar, tu cita quedará agendada inmediatamente."
          : "Al confirmar, enviaremos tu solicitud al negocio para que la apruebe."}
      </p>
    </div>
  );
}

function ConfirmationView({
  config,
  result,
  service,
  employeeName,
  onClose,
}: {
  config: BookingConfig;
  result: BookingResultData;
  service: BookingService | null;
  employeeName: string;
  onClose: () => void;
}) {
  const manageUrl = `/reservar/${config.slug}/cita/${result.token}`;
  const confirmed = result.status === "confirmed";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${manageUrl}`,
      );
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="max-h-[90dvh] overflow-y-auto p-6 pr-12 sm:p-8">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          {confirmed ? "¡Tu cita está confirmada!" : "Recibimos tu solicitud"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {confirmed
            ? "Te enviamos los detalles por correo. Guarda el enlace para gestionar tu cita."
            : "El negocio revisará la disponibilidad y te confirmará por correo."}
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{service?.name ?? "Tu cita"}</p>
            <Badge variant={confirmed ? "success" : "warning"}>
              {confirmed ? "Confirmada" : "Pendiente"}
            </Badge>
          </div>
          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              {longDate(
                formatInTimeZone(
                  new Date(result.startsAt),
                  config.timezone,
                  "yyyy-MM-dd",
                ),
              )}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="size-4" />
              {formatTimeInTz(result.startsAt, config.timezone)}
              {service ? ` · ${service.durationMinutes} min` : ""}
            </p>
            {config.showEmployees ? (
              <p className="flex items-center gap-2">
                <UserRound className="size-4" /> {employeeName}
              </p>
            ) : null}
            {config.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="size-4" /> {config.location}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href={manageUrl}>Gestionar mi cita</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={copyLink}
          >
            <Copy /> Copiar enlace
          </Button>
        </div>

        <Button type="button" variant="ghost" className="mt-3" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}

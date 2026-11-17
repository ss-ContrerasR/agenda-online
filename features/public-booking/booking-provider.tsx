"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { BookingWizard, type BookingConfig } from "@/features/public-booking/booking-wizard";

type BookingContextValue = {
  openWizard: (serviceId?: string) => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking debe usarse dentro de PublicBookingProvider");
  }
  return context;
}

export function PublicBookingProvider({
  config,
  children,
}: {
  config: BookingConfig;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [initialServiceId, setInitialServiceId] = useState<string | null>(null);
  const [instance, setInstance] = useState(0);
  /**
   * El asistente registra aquí su propio manejador de salida. Así Escape, la X
   * y el clic fuera del modal pasan por la confirmación en lugar de cerrar la
   * reserva a medias.
   */
  const requestCloseRef = useRef<() => void>(() => setOpen(false));

  const registerCloseHandler = useCallback((handler: () => void) => {
    requestCloseRef.current = handler;
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    requestCloseRef.current();
  }, []);

  const openWizard = useCallback((serviceId?: string) => {
    setInitialServiceId(serviceId ?? null);
    setInstance((value) => value + 1);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openWizard }), [openWizard]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Reservar una cita</DialogTitle>
          <DialogDescription className="sr-only">
            Elige servicio, profesional, fecha y hora para reservar tu cita en
            línea.
          </DialogDescription>
          {open ? (
            <BookingWizard
              key={instance}
              config={config}
              initialServiceId={initialServiceId}
              onClose={() => setOpen(false)}
              registerCloseHandler={registerCloseHandler}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </BookingContext.Provider>
  );
}

export function OpenBookingButton({
  children = "Reservar cita",
  size = "lg",
  variant = "default",
  className,
}: {
  children?: ReactNode;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const { openWizard } = useBooking();
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() => openWizard()}
    >
      <CalendarDays />
      {children}
    </Button>
  );
}

export function BookServiceButton({
  serviceId,
  children = "Reservar",
  size = "sm",
  variant = "default",
  className,
}: {
  serviceId: string;
  children?: ReactNode;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const { openWizard } = useBooking();
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() => openWizard(serviceId)}
    >
      {children}
    </Button>
  );
}

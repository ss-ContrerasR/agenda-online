"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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

  const openWizard = useCallback((serviceId?: string) => {
    setInitialServiceId(serviceId ?? null);
    setInstance((value) => value + 1);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openWizard }), [openWizard]);

  return (
    <BookingContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
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

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: unknown;
};

export const initialActionState: ActionResult = { ok: false };

export class AppError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  SLOT_CONFLICT:
    "Ese horario acaba de ocuparse. Elige otro horario disponible.",
  SLOT_IN_PAST: "No puedes agendar una cita en el pasado.",
  MIN_NOTICE: "El horario no cumple la anticipación mínima configurada.",
  MAX_ADVANCE: "La fecha supera el máximo de anticipación permitido.",
  OUTSIDE_HOURS: "El horario está fuera del horario de atención.",
  DAY_CLOSED: "El negocio no atiende en esa fecha.",
  APPOINTMENT_NOT_FOUND: "No encontramos la cita solicitada.",
  APPOINTMENT_NOT_CANCELLABLE: "Esta cita ya no se puede cancelar.",
  APPOINTMENT_NOT_RESCHEDULABLE: "Esta cita ya no se puede reprogramar.",
  APPOINTMENT_ALREADY_STARTED: "La cita ya comenzó.",
  CANCELLATION_WINDOW:
    "Ya pasó el plazo permitido para cancelar. Contacta al negocio.",
  RESCHEDULE_WINDOW:
    "Ya pasó el plazo permitido para reprogramar. Contacta al negocio.",
  ORGANIZATION_NOT_FOUND: "El negocio no está disponible.",
  ORGANIZATION_LAST_OWNER:
    "La organización debe conservar al menos un propietario activo.",
  SERVICE_NOT_FOUND: "El servicio no está disponible.",
  EMPLOYEE_NOT_FOUND: "El profesional no está disponible.",
  EMPLOYEE_SERVICE_MISMATCH:
    "El profesional seleccionado no realiza ese servicio.",
  CLIENT_NOT_FOUND: "No encontramos el cliente.",
  SETTINGS_NOT_FOUND: "La configuración del negocio está incompleta.",
  FORBIDDEN: "No tienes permisos para realizar esta acción.",
  DUPLICATE_EMAIL: "Ya existe un cliente con ese correo electrónico.",
  DUPLICATE_SLUG: "Ese identificador público ya está en uso.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  EMAIL_NOT_CONFIRMED: "Debes confirmar tu correo antes de ingresar.",
};

export function getActionError(error: unknown): string {
  if (error instanceof AppError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) {
    const raw = error.message;
    const known = Object.keys(ERROR_MESSAGES).find((code) =>
      raw.includes(code),
    );
    if (known) return ERROR_MESSAGES[known];
    if (raw.includes("duplicate key") && raw.includes("clients")) {
      return ERROR_MESSAGES.DUPLICATE_EMAIL;
    }
    if (raw.includes("duplicate key") && raw.includes("slug")) {
      return ERROR_MESSAGES.DUPLICATE_SLUG;
    }
    if (raw.includes("AuthApiError")) {
      return "No fue posible completar la operación de autenticación.";
    }
    return raw;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export function fieldErrorsFromZod(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

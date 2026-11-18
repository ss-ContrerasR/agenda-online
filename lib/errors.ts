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
  APPOINTMENT_STATUS_LOCKED:
    "Esta cita ya está cerrada y no admite más cambios de estado.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  EMAIL_NOT_CONFIRMED: "Debes confirmar tu correo antes de ingresar.",
};

/**
 * Supabase/PostgREST devuelve errores como objetos planos con `message`, no como
 * instancias de Error. Sin este normalization todos se convertían en el texto
 * genérico "Ocurrió un error inesperado" y era imposible diagnosticarlos.
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "";
}

export function getActionError(error: unknown): string {
  if (error instanceof AppError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }

  const raw = errorMessage(error);
  if (!raw) return "Ocurrió un error inesperado. Inténtalo de nuevo.";

  if (/row-level security|42501|42503/i.test(raw)) {
    return "No tienes permisos para guardar este horario.";
  }
  if (/violates foreign key constraint|23503/i.test(raw)) {
    return "El profesional seleccionado ya no está disponible.";
  }
  if (/violates check constraint|23514/i.test(raw)) {
    return "Revisa los horarios: la hora final debe ser mayor a la inicial.";
  }

  if (/duplicate key|unique constraint/i.test(raw)) {
    if (/profiles/i.test(raw)) {
      return "Ya existe un perfil con ese correo o identificador. Usa 'Usuario existente' para vincularlo.";
    }
    if (/organization_members/i.test(raw)) {
      return "Ese usuario ya pertenece al equipo de esta organización.";
    }
    if (/employees/i.test(raw)) {
      return "Ya existe una ficha de empleado para ese usuario.";
    }
    if (/clients/i.test(raw)) return ERROR_MESSAGES.DUPLICATE_EMAIL;
    if (/slug/i.test(raw)) return ERROR_MESSAGES.DUPLICATE_SLUG;
  }

  const known = Object.keys(ERROR_MESSAGES).find((code) => raw.includes(code));
  if (known) return ERROR_MESSAGES[known];
  if (
    raw.includes("exclusion constraint") ||
    raw.includes("appointments_no_overlap")
  ) {
    return ERROR_MESSAGES.SLOT_CONFLICT;
  }
  if (raw.includes("AuthApiError")) {
    return "No fue posible completar la operación de autenticación.";
  }
  return raw;
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

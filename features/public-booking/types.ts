import type {
  AppointmentRow,
  AppointmentStatusHistoryRow,
  BusinessHoursRow,
  ClientRow,
  EmployeeRow,
  OrganizationRow,
  OrganizationSettingsRow,
  ServiceCategoryRow,
  ServiceRow,
} from "@/types/database";

export type PublicBookingData = {
  organization: OrganizationRow;
  settings: OrganizationSettingsRow;
  categories: ServiceCategoryRow[];
  services: ServiceRow[];
  employees: EmployeeRow[];
  employeeServices: Array<{ employee_id: string; service_id: string }>;
  businessHours: BusinessHoursRow[];
  minDate: string;
  maxDate: string;
};

export type PublicAppointmentDetails = {
  appointment: AppointmentRow;
  organization: OrganizationRow;
  settings: OrganizationSettingsRow;
  service: ServiceRow;
  employee: EmployeeRow;
  client: ClientRow;
  history: AppointmentStatusHistoryRow[];
};

export type PublicSlot = {
  start: string;
  end: string;
  employeeIds: string[];
};

export type SlotEmployee = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type SlotsPayload = {
  date: string;
  timezone: string;
  slots: PublicSlot[];
  employees: SlotEmployee[];
};

export type BookingResultData = {
  id: string;
  token: string;
  status: string;
  startsAt: string;
};

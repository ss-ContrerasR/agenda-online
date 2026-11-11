export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = "owner" | "admin" | "receptionist" | "employee";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";
export type BookingConfirmationMode = "automatic" | "manual";
export type PublicTheme = "light" | "dark" | "system";
export type NotificationChannel = "email" | "in_app" | "whatsapp";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type OrganizationSettingsRow = {
  organization_id: string;
  confirmation_mode: BookingConfirmationMode;
  min_notice_minutes: number;
  slot_interval_minutes: number;
  max_advance_days: number;
  buffer_minutes: number;
  cancellation_notice_hours: number;
  reschedule_notice_hours: number;
  policy_text: string | null;
  allow_employee_selection: boolean;
  show_prices: boolean;
  show_employees: boolean;
  email_notifications: boolean;
  reminder_hours: number;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  theme_preset: string;
  dark_mode_enabled: boolean;
  public_theme: PublicTheme;
  public_hero_url: string | null;
  public_about: string | null;
  socials: Json;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  employee_id: string | null;
  role: MemberRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EmployeeRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  position: string | null;
  bio: string | null;
  specialties: string[];
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ClientRow = {
  id: string;
  organization_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  document: string | null;
  birth_date: string | null;
  address: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ServiceCategoryRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ServiceRow = {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  color: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type EmployeeServiceRow = {
  organization_id: string;
  employee_id: string;
  service_id: string;
  created_at: string;
};

export type BusinessHoursRow = {
  id: string;
  organization_id: string;
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeScheduleRow = {
  id: string;
  organization_id: string;
  employee_id: string;
  weekday: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

export type ScheduleBreakRow = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  label: string | null;
  created_at: string;
};

export type ScheduleExceptionRow = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  exception_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AppointmentRow = {
  id: string;
  organization_id: string;
  client_id: string;
  service_id: string;
  employee_id: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  price: number;
  status: AppointmentStatus;
  notes: string | null;
  internal_notes: string | null;
  source: string;
  public_token: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AppointmentStatusHistoryRow = {
  id: string;
  organization_id: string;
  appointment_id: string;
  from_status: AppointmentStatus | null;
  to_status: AppointmentStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  appointment_id: string | null;
  type: string;
  channel: NotificationChannel;
  recipient: string | null;
  title: string;
  body: string | null;
  status: NotificationStatus;
  provider_id: string | null;
  error: string | null;
  metadata: Json;
  sent_at: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
};

export type PlatformAdminRow = {
  user_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<OrganizationRow, "name" | "slug">;
      organization_settings: Table<
        OrganizationSettingsRow,
        "organization_id"
      >;
      profiles: Table<ProfileRow, "id">;
      platform_admins: Table<PlatformAdminRow, "user_id">;
      organization_members: Table<
        OrganizationMemberRow,
        "organization_id" | "user_id"
      >;
      employees: Table<
        EmployeeRow,
        "organization_id" | "full_name"
      >;
      clients: Table<
        ClientRow,
        "organization_id" | "full_name" | "phone"
      >;
      service_categories: Table<
        ServiceCategoryRow,
        "organization_id" | "name"
      >;
      services: Table<
        ServiceRow,
        "organization_id" | "name" | "duration_minutes"
      >;
      employee_services: Table<
        EmployeeServiceRow,
        "organization_id" | "employee_id" | "service_id"
      >;
      business_hours: Table<
        BusinessHoursRow,
        "organization_id" | "weekday"
      >;
      employee_schedules: Table<
        EmployeeScheduleRow,
        "organization_id" | "employee_id" | "weekday"
      >;
      schedule_breaks: Table<
        ScheduleBreakRow,
        "organization_id" | "weekday" | "start_time" | "end_time"
      >;
      schedule_exceptions: Table<
        ScheduleExceptionRow,
        "organization_id" | "exception_date"
      >;
      appointments: Table<
        AppointmentRow,
        | "organization_id"
        | "client_id"
        | "service_id"
        | "employee_id"
        | "starts_at"
        | "ends_at"
        | "duration_minutes"
      >;
      appointment_status_history: Table<
        AppointmentStatusHistoryRow,
        "organization_id" | "appointment_id" | "to_status"
      >;
      notifications: Table<
        NotificationRow,
        "organization_id" | "type" | "title"
      >;
      audit_logs: Table<AuditLogRow, "action">;
    };
    Views: Record<string, never>;
    Functions: {
      create_appointment: {
        Args: {
          p_organization_id: string;
          p_client_id: string;
          p_service_id: string;
          p_employee_id: string;
          p_starts_at: string;
          p_notes?: string | null;
          p_source?: string;
          p_created_by?: string | null;
        };
        Returns: AppointmentRow;
      };
      reschedule_appointment: {
        Args: {
          p_appointment_id: string;
          p_starts_at: string;
          p_actor?: string | null;
          p_reason?: string | null;
        };
        Returns: AppointmentRow;
      };
      cancel_appointment: {
        Args: {
          p_appointment_id: string;
          p_actor?: string | null;
          p_reason?: string | null;
        };
        Returns: AppointmentRow;
      };
      cancel_appointment_by_token: {
        Args: { p_token: string; p_reason?: string | null };
        Returns: AppointmentRow;
      };
      reschedule_appointment_by_token: {
        Args: { p_token: string; p_starts_at: string };
        Returns: AppointmentRow;
      };
    };
    Enums: {
      member_role: MemberRole;
      appointment_status: AppointmentStatus;
      booking_confirmation_mode: BookingConfirmationMode;
      public_theme: PublicTheme;
      notification_channel: NotificationChannel;
      notification_status: NotificationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

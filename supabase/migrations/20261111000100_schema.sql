-- =============================================================================
-- AgendaPro — Esquema base (multi-tenant)
-- Ejecutar en Supabase (SQL Editor o `supabase db reset`).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'receptionist', 'employee');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.booking_confirmation_mode as enum ('automatic', 'manual');
create type public.public_theme as enum ('light', 'dark', 'system');
create type public.notification_channel as enum ('email', 'in_app', 'whatsapp');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Organizaciones
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  logo_url text,
  cover_url text,
  phone text,
  email text,
  address text,
  city text,
  country text default 'Colombia',
  timezone text not null default 'America/Bogota',
  currency text not null default 'COP' check (char_length(currency) = 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index organizations_active_idx on public.organizations (slug) where deleted_at is null;

create trigger organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Configuración / apariencia / reservas
-- -----------------------------------------------------------------------------
create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  confirmation_mode public.booking_confirmation_mode not null default 'automatic',
  min_notice_minutes integer not null default 120 check (min_notice_minutes >= 0),
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes between 5 and 120),
  max_advance_days integer not null default 60 check (max_advance_days between 1 and 365),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 240),
  cancellation_notice_hours integer not null default 24 check (cancellation_notice_hours >= 0),
  reschedule_notice_hours integer not null default 12 check (reschedule_notice_hours >= 0),
  policy_text text,
  allow_employee_selection boolean not null default true,
  show_prices boolean not null default true,
  show_employees boolean not null default true,
  email_notifications boolean not null default true,
  reminder_hours integer not null default 24 check (reminder_hours between 0 and 168),
  brand_primary text not null default '#0F766E' check (brand_primary ~ '^#[0-9a-fA-F]{6}$'),
  brand_secondary text not null default '#0EA5E9' check (brand_secondary ~ '^#[0-9a-fA-F]{6}$'),
  brand_accent text not null default '#F59E0B' check (brand_accent ~ '^#[0-9a-fA-F]{6}$'),
  theme_preset text not null default 'teal',
  dark_mode_enabled boolean not null default true,
  public_theme public.public_theme not null default 'system',
  public_hero_url text,
  public_about text,
  socials jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organization_settings_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Perfiles y accesos
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  photo_url text,
  position text,
  bio text,
  specialties text[] not null default '{}',
  color text not null default '#0F766E',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index employees_organization_idx on public.employees (organization_id) where deleted_at is null;

create trigger employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  role public.member_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create unique index organization_members_employee_unique
  on public.organization_members (employee_id) where employee_id is not null;

create index organization_members_user_idx on public.organization_members (user_id);

create trigger organization_members_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text not null,
  document text,
  birth_date date,
  address text,
  notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index clients_organization_idx on public.clients (organization_id) where deleted_at is null;
create index clients_name_idx on public.clients (organization_id, lower(full_name)) where deleted_at is null;
create unique index clients_email_unique on public.clients (organization_id, lower(email))
  where email is not null and deleted_at is null;

create trigger clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#0F766E',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index service_categories_organization_idx on public.service_categories (organization_id) where deleted_at is null;

create trigger service_categories_updated_at
before update on public.service_categories
for each row execute function public.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 1440),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 240),
  color text not null default '#0F766E',
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index services_organization_idx on public.services (organization_id) where deleted_at is null;
create index services_category_idx on public.services (category_id);

create trigger services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create table public.employee_services (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, service_id)
);

create index employee_services_service_idx on public.employee_services (service_id);

-- -----------------------------------------------------------------------------
-- Horarios
-- -----------------------------------------------------------------------------
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '18:00',
  break_start time,
  break_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, weekday),
  check (close_time > open_time),
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_end > break_start)
  )
);

create trigger business_hours_updated_at
before update on public.business_hours
for each row execute function public.set_updated_at();

create table public.employee_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_working boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, weekday),
  check (end_time > start_time)
);

create index employee_schedules_employee_idx on public.employee_schedules (employee_id);

create trigger employee_schedules_updated_at
before update on public.employee_schedules
for each row execute function public.set_updated_at();

create table public.schedule_breaks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index schedule_breaks_org_idx on public.schedule_breaks (organization_id, weekday);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  exception_date date not null,
  is_closed boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_closed or (start_time is not null and end_time is not null and end_time > start_time))
);

create unique index schedule_exceptions_unique
  on public.schedule_exceptions (organization_id, exception_date, coalesce(employee_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index schedule_exceptions_date_idx on public.schedule_exceptions (organization_id, exception_date);

create trigger schedule_exceptions_updated_at
before update on public.schedule_exceptions
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Citas
-- -----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(12, 2) not null default 0,
  status public.appointment_status not null default 'pending',
  notes text,
  internal_notes text,
  source text not null default 'admin' check (source in ('admin', 'public')),
  public_token uuid not null unique default gen_random_uuid(),
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at > starts_at)
);

create index appointments_organization_idx on public.appointments (organization_id, starts_at);
create index appointments_employee_idx on public.appointments (employee_id, starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at desc);
create index appointments_status_idx on public.appointments (organization_id, status);
create index appointments_public_token_idx on public.appointments (public_token);

-- Garantiza a nivel de base de datos que un empleado no tenga dos citas activas
-- solapadas, incluso con peticiones concurrentes.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    employee_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed') and deleted_at is null);

create trigger appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create table public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index appointment_history_appointment_idx on public.appointment_status_history (appointment_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Notificaciones y auditoría
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  type text not null,
  channel public.notification_channel not null default 'email',
  recipient text,
  title text not null,
  body text,
  status public.notification_status not null default 'pending',
  provider_id text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_organization_idx on public.notifications (organization_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_organization_idx on public.audit_logs (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Perfil automático al registrarse
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

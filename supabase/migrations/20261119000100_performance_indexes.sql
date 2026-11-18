-- =============================================================================
-- AgendaTEX — Índices de rendimiento
-- Optimiza las consultas más frecuentes del panel: listados ordenados,
-- conteos por período, agenda por estado y búsquedas por texto.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

set search_path = public, extensions;

-- Agenda: filtrar por organización y estado, ordenando por fecha.
create index if not exists appointments_org_status_starts_active_idx
  on public.appointments (organization_id, status, starts_at)
  where deleted_at is null;

-- Clientes nuevos por período y listado alfabético.
create index if not exists clients_org_created_active_idx
  on public.clients (organization_id, created_at)
  where deleted_at is null;

create index if not exists clients_org_name_active_idx
  on public.clients (organization_id, full_name)
  where deleted_at is null;

-- Equipo y servicios: listados alfabéticos por organización.
create index if not exists employees_org_name_active_idx
  on public.employees (organization_id, full_name)
  where deleted_at is null;

create index if not exists services_org_name_active_idx
  on public.services (organization_id, name)
  where deleted_at is null;

-- Búsquedas por coincidencia parcial (ILIKE '%texto%'). Sin trigramas,
-- Postgres recorre toda la tabla en cada búsqueda del panel.
create index if not exists clients_full_name_trgm_idx
  on public.clients using gin (full_name gin_trgm_ops)
  where deleted_at is null;

create index if not exists clients_email_trgm_idx
  on public.clients using gin (email gin_trgm_ops)
  where deleted_at is null;

create index if not exists clients_phone_trgm_idx
  on public.clients using gin (phone gin_trgm_ops)
  where deleted_at is null;

create index if not exists clients_document_trgm_idx
  on public.clients using gin (document gin_trgm_ops)
  where deleted_at is null;

create index if not exists employees_full_name_trgm_idx
  on public.employees using gin (full_name gin_trgm_ops)
  where deleted_at is null;

create index if not exists employees_email_trgm_idx
  on public.employees using gin (email gin_trgm_ops)
  where deleted_at is null;

create index if not exists employees_position_trgm_idx
  on public.employees using gin (position gin_trgm_ops)
  where deleted_at is null;

create index if not exists services_name_trgm_idx
  on public.services using gin (name gin_trgm_ops)
  where deleted_at is null;

-- Buscador de plataforma (/admin).
create index if not exists organizations_name_trgm_idx
  on public.organizations using gin (name gin_trgm_ops)
  where deleted_at is null;

create index if not exists organizations_slug_trgm_idx
  on public.organizations using gin (slug gin_trgm_ops)
  where deleted_at is null;

create index if not exists organizations_email_trgm_idx
  on public.organizations using gin (email gin_trgm_ops)
  where deleted_at is null;

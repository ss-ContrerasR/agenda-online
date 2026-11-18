-- =============================================================================
-- AgendaTEX — Plantilla de correos personalizable por organización
-- Una fila por organización. Se usa tanto para los correos automáticos de citas
-- como para los envíos manuales desde el panel.
-- =============================================================================

set search_path = public, extensions;

create table public.email_templates (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  layout text not null default 'classic'
    check (layout in ('classic', 'compact', 'minimal')),
  logo_url text,
  accent_color text not null default '#0F766E'
    check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  background_color text not null default '#F1F5F9'
    check (background_color ~ '^#[0-9a-fA-F]{6}$'),
  text_color text not null default '#0F172A'
    check (text_color ~ '^#[0-9a-fA-F]{6}$'),
  sender_name text,
  sender_email text,
  header_title text,
  header_subtitle text,
  footer_text text,
  button_label text,
  show_logo boolean not null default true,
  show_details boolean not null default true,
  socials jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

-- Cualquier miembro activo puede leer la plantilla de su organización.
create policy email_templates_select on public.email_templates
for select using (
  public.is_org_member(organization_id) or public.is_platform_admin()
);

-- Owner, admin y recepcionista pueden crear y editar la plantilla.
create policy email_templates_insert on public.email_templates
for insert with check (
  public.has_org_role(
    organization_id,
    array['owner', 'admin', 'receptionist']::public.member_role[]
  )
);

create policy email_templates_update on public.email_templates
for update using (
  public.has_org_role(
    organization_id,
    array['owner', 'admin', 'receptionist']::public.member_role[]
  )
  or public.is_platform_admin()
)
with check (
  public.has_org_role(
    organization_id,
    array['owner', 'admin', 'receptionist']::public.member_role[]
  )
  or public.is_platform_admin()
);

-- El correo del dueño es el remitente visible. Se guarda en la plantilla para
-- que el envío no dependa de una consulta adicional en cada notificación.
comment on column public.email_templates.sender_email is
  'Correo del propietario usado como remitente/respuesta de los envíos.';

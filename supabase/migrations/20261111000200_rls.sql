-- =============================================================================
-- AgendaPro — Row Level Security (aislamiento multiempresa)
-- =============================================================================

set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER para evitar recursión en políticas)
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create or replace function public.org_role(p_organization_id uuid)
returns public.member_role
language sql stable security definer set search_path = public
as $$
  select m.role from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active
  limit 1;
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid());
$$;

create or replace function public.current_employee_id(p_organization_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select m.employee_id from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active
  limit 1;
$$;

-- Protege al último propietario de una organización.
create or replace function public.protect_last_owner()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_remaining integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and old.is_active then
      select count(*) into v_remaining
      from public.organization_members
      where organization_id = old.organization_id and role = 'owner' and is_active and id <> old.id;
      if v_remaining = 0 then
        raise exception 'La organización debe conservar al menos un propietario activo.';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'owner' and old.is_active and (new.role <> 'owner' or new.is_active = false) then
    select count(*) into v_remaining
    from public.organization_members
    where organization_id = old.organization_id and role = 'owner' and is_active and id <> old.id;
    if v_remaining = 0 then
      raise exception 'La organización debe conservar al menos un propietario activo.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_protect_owner on public.organization_members;
create trigger organization_members_protect_owner
before update or delete on public.organization_members
for each row execute function public.protect_last_owner();

-- -----------------------------------------------------------------------------
-- Habilitar RLS
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organization_members enable row level security;
alter table public.employees enable row level security;
alter table public.clients enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.employee_services enable row level security;
alter table public.business_hours enable row level security;
alter table public.employee_schedules enable row level security;
alter table public.schedule_breaks enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create policy organizations_select on public.organizations
for select using (public.is_org_member(id) or public.is_platform_admin());

create policy organizations_update on public.organizations
for update using (public.has_org_role(id, array['owner','admin']::public.member_role[]) or public.is_platform_admin())
with check (public.has_org_role(id, array['owner','admin']::public.member_role[]) or public.is_platform_admin());

create policy organizations_insert on public.organizations
for insert with check (public.is_platform_admin());

create policy organizations_delete on public.organizations
for delete using (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- organization_settings
-- -----------------------------------------------------------------------------
create policy settings_select on public.organization_settings
for select using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy settings_insert on public.organization_settings
for insert with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy settings_update on public.organization_settings
for update using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]) or public.is_platform_admin())
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]) or public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles
for select using (
  id = auth.uid()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.organization_members me
    join public.organization_members peer on peer.organization_id = me.organization_id
    where me.user_id = auth.uid() and me.is_active and peer.user_id = profiles.id
  )
);

create policy profiles_update on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_insert on public.profiles
for insert with check (public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- platform_admins
-- -----------------------------------------------------------------------------
create policy platform_admins_select on public.platform_admins
for select using (user_id = auth.uid() or public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------
create policy members_select on public.organization_members
for select using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy members_insert on public.organization_members
for insert with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy members_update on public.organization_members
for update using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy members_delete on public.organization_members
for delete using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
-- employees
-- -----------------------------------------------------------------------------
create policy employees_select on public.employees
for select using (public.is_org_member(organization_id) or public.is_platform_admin());

create policy employees_insert on public.employees
for insert with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy employees_update on public.employees
for update using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy employees_delete on public.employees
for delete using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
create policy clients_select on public.clients
for select using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
  or (
    public.has_org_role(organization_id, array['employee']::public.member_role[])
    and exists (
      select 1 from public.appointments a
      where a.client_id = clients.id
        and a.organization_id = clients.organization_id
        and a.employee_id = public.current_employee_id(clients.organization_id)
    )
  )
  or public.is_platform_admin()
);

create policy clients_insert on public.clients
for insert with check (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]));

create policy clients_update on public.clients
for update using (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]));

create policy clients_delete on public.clients
for delete using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create policy categories_select on public.service_categories
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy categories_write on public.service_categories
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy services_select on public.services
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy services_write on public.services
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy employee_services_select on public.employee_services
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy employee_services_write on public.employee_services
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
-- Horarios
-- -----------------------------------------------------------------------------
create policy business_hours_select on public.business_hours
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy business_hours_write on public.business_hours
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy employee_schedules_select on public.employee_schedules
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy employee_schedules_write on public.employee_schedules
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy schedule_breaks_select on public.schedule_breaks
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy schedule_breaks_write on public.schedule_breaks
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy schedule_exceptions_select on public.schedule_exceptions
for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy schedule_exceptions_write on public.schedule_exceptions
for all using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- -----------------------------------------------------------------------------
-- appointments
-- -----------------------------------------------------------------------------
create policy appointments_select on public.appointments
for select using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
  or (
    public.has_org_role(organization_id, array['employee']::public.member_role[])
    and employee_id = public.current_employee_id(organization_id)
  )
  or public.is_platform_admin()
);

create policy appointments_insert on public.appointments
for insert with check (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]));

create policy appointments_update on public.appointments
for update using (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]));

create policy appointments_delete on public.appointments
for delete using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy appointment_history_select on public.appointment_status_history
for select using (
  exists (
    select 1 from public.appointments a
    where a.id = appointment_status_history.appointment_id
      and (
        public.has_org_role(a.organization_id, array['owner','admin','receptionist']::public.member_role[])
        or (public.has_org_role(a.organization_id, array['employee']::public.member_role[])
            and a.employee_id = public.current_employee_id(a.organization_id))
      )
  )
  or public.is_platform_admin()
);

create policy appointment_history_insert on public.appointment_status_history
for insert with check (public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[]));

-- -----------------------------------------------------------------------------
-- Notificaciones / auditoría
-- -----------------------------------------------------------------------------
create policy notifications_select on public.notifications
for select using (
  user_id = auth.uid()
  or public.has_org_role(organization_id, array['owner','admin']::public.member_role[])
  or public.is_platform_admin()
);

create policy audit_logs_select on public.audit_logs
for select using (
  public.has_org_role(organization_id, array['owner','admin']::public.member_role[])
  or public.is_platform_admin()
);

-- -----------------------------------------------------------------------------
-- Storage (logos e imágenes)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-assets',
  'organization-assets',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

create policy organization_assets_public_read on storage.objects
for select using (bucket_id = 'organization-assets');

create policy organization_assets_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy organization_assets_update on storage.objects
for update to authenticated using (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy organization_assets_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function public.is_org_member(uuid) to anon;
grant execute on function public.org_role(uuid) to anon;
grant execute on function public.has_org_role(uuid, public.member_role[]) to anon;
grant execute on function public.is_platform_admin() to anon;

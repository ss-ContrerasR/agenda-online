-- =============================================================================
-- AgendaTEX — Licencias por organización, vencimientos y suspensión total
-- Ejecutar después de 20261117000100_superadmin_suspension.sql
-- =============================================================================

set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Datos de licencia. `current_period_end` se mantiene por compatibilidad con la
-- facturación anterior y siempre se sincroniza con `license_expires_at`.
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists license_start_at timestamptz,
  add column if not exists license_expires_at timestamptz,
  add column if not exists license_plan text not null default 'trial'
    check (
      license_plan in (
        'trial', 'monthly', 'bimonthly', 'semiannual', 'annual', 'custom'
      )
    );

create index if not exists organizations_license_expires_idx
  on public.organizations (license_expires_at);

-- -----------------------------------------------------------------------------
-- Una organización suspendida debe quedar sin acceso en el panel completo,
-- pero su fila debe seguir siendo legible para mostrar el aviso de pago.
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member_raw(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.uid() is not null and not public.is_user_suspended(auth.uid()), false)
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
        and m.is_active
    );
$$;

create or replace function public.is_org_active(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = p_organization_id
      and o.is_active
      and o.billing_status not in ('suspended', 'cancelled')
  );
$$;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_member_raw(p_organization_id)
    and public.is_org_active(p_organization_id);
$$;

create or replace function public.org_role(p_organization_id uuid)
returns public.member_role
language sql stable security definer set search_path = public
as $$
  select m.role from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active
    and public.is_org_active(p_organization_id)
    and not public.is_user_suspended(auth.uid())
  limit 1;
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles public.member_role[]
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_member_raw(p_organization_id)
    and public.is_org_active(p_organization_id)
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
        and m.is_active
        and m.role = any (p_roles)
    );
$$;

create or replace function public.current_employee_id(p_organization_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select m.employee_id from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active
    and public.is_org_active(p_organization_id)
    and not public.is_user_suspended(auth.uid())
  limit 1;
$$;

grant execute on function public.is_org_member_raw(uuid) to anon, authenticated;
grant execute on function public.is_org_active(uuid) to anon, authenticated;

-- La lectura de la propia organización se permite aunque esté suspendida para
-- que el panel pueda mostrar el aviso y redirigir a /suspendido.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select using (public.is_org_member_raw(id) or public.is_platform_admin());

-- La membresía también debe permanecer legible: sin ella la aplicación no
-- sabría a qué organización redirigir ni podría mostrar el aviso de pago.
drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members
for select using (public.is_org_member_raw(organization_id) or public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Solo la plataforma puede cambiar fechas, plan o disponibilidad de la licencia.
-- -----------------------------------------------------------------------------
create or replace function public.protect_organization_billing_state()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    new.billing_status is distinct from old.billing_status
    or new.current_period_end is distinct from old.current_period_end
    or new.license_start_at is distinct from old.license_start_at
    or new.license_expires_at is distinct from old.license_expires_at
    or new.license_plan is distinct from old.license_plan
    or new.is_active is distinct from old.is_active
    or new.suspended_at is distinct from old.suspended_at
    or new.suspended_reason is distinct from old.suspended_reason
  ) and not public.can_manage_platform_state() then
    raise exception 'Solo la plataforma puede cambiar la licencia o el estado de facturación.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_organization_billing_state on public.organizations;
create trigger protect_organization_billing_state
before update on public.organizations
for each row execute function public.protect_organization_billing_state();

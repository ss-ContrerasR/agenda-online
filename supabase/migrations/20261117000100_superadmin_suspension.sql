-- =============================================================================
-- AgendaPro — Superadministrador, suspensión de usuarios y facturación
-- Ejecutar después de las migraciones base (SQL Editor o `supabase db reset`).
-- =============================================================================

set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Estado de suscripción y suspensión
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_until timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists suspended_by uuid references public.profiles(id) on delete set null,
  add column if not exists membership_status text not null default 'active'
    check (membership_status in ('active', 'trialing', 'past_due', 'suspended', 'cancelled')),
  add column if not exists membership_expires_at timestamptz;

alter table public.organizations
  add column if not exists billing_status text not null default 'active'
    check (billing_status in ('active', 'trialing', 'past_due', 'suspended', 'cancelled')),
  add column if not exists current_period_end timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

create index if not exists profiles_suspended_idx on public.profiles (is_suspended) where is_suspended;
create index if not exists profiles_membership_status_idx on public.profiles (membership_status);
create index if not exists organizations_billing_status_idx on public.organizations (billing_status);

create table if not exists public.user_suspension_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null check (action in ('suspended', 'reactivated')),
  reason text,
  suspended_until timestamptz,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists user_suspension_history_user_idx
  on public.user_suspension_history (user_id, created_at desc);

alter table public.user_suspension_history enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: un usuario suspendido no puede acceder a datos de ninguna empresa
-- -----------------------------------------------------------------------------
create or replace function public.is_user_suspended(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (
        (
          (p.is_suspended or p.suspended_until is not null)
          and (p.suspended_until is null or p.suspended_until > now())
        )
        or p.membership_status in ('suspended', 'cancelled')
      )
  );
$$;

grant execute on function public.is_user_suspended(uuid) to anon, authenticated;

create or replace function public.can_manage_platform_state()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_platform_admin()
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

grant execute on function public.can_manage_platform_state() to authenticated, service_role;

-- Los helpers de pertenencia delegan en is_user_suspended para que una
-- suspensión surta efecto incluso con un JWT emitido antes de la suspensión.
create or replace function public.is_org_member(p_organization_id uuid)
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

create or replace function public.org_role(p_organization_id uuid)
returns public.member_role
language sql stable security definer set search_path = public
as $$
  select m.role from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active
    and not public.is_user_suspended(auth.uid())
  limit 1;
$$;

create or replace function public.has_org_role(p_organization_id uuid, p_roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(auth.uid() is not null and not public.is_user_suspended(auth.uid()), false)
    and exists (
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
  select coalesce(auth.uid() is not null and not public.is_user_suspended(auth.uid()), false)
    and exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid());
$$;

create or replace function public.current_employee_id(p_organization_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select m.employee_id from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid()
    and m.is_active
    and not public.is_user_suspended(auth.uid())
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Políticas: el superadministrador puede suspender y ver el historial
-- -----------------------------------------------------------------------------
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (id = auth.uid() or public.is_platform_admin())
with check (id = auth.uid() or public.is_platform_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (
  id = auth.uid()
  or public.is_platform_admin()
  or (
    not public.is_user_suspended(auth.uid())
    and exists (
      select 1
      from public.organization_members me
      join public.organization_members peer on peer.organization_id = me.organization_id
      where me.user_id = auth.uid() and me.is_active and peer.user_id = profiles.id
    )
  )
);

drop policy if exists suspension_history_select on public.user_suspension_history;
create policy suspension_history_select on public.user_suspension_history
for select using (
  public.is_platform_admin()
  or (user_id = auth.uid() and not public.is_user_suspended(auth.uid()))
);

-- El superadministrador es el único que puede escribir el historial desde SQL;
-- la aplicación usa el cliente service-role y registra cada cambio aquí.
drop policy if exists suspension_history_insert on public.user_suspension_history;
create policy suspension_history_insert on public.user_suspension_history
for insert with check (public.is_platform_admin());

grant select, insert, update, delete on public.user_suspension_history to authenticated;

-- -----------------------------------------------------------------------------
-- Un usuario normal puede editar su perfil, pero nunca su propio estado de
-- suspensión/membresía. Igualmente, un dueño de empresa no puede cambiar el
-- estado de facturación de su organización.
-- -----------------------------------------------------------------------------
create or replace function public.protect_profile_platform_state()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    new.is_suspended is distinct from old.is_suspended
    or new.suspended_at is distinct from old.suspended_at
    or new.suspended_until is distinct from old.suspended_until
    or new.suspended_reason is distinct from old.suspended_reason
    or new.suspended_by is distinct from old.suspended_by
    or new.membership_status is distinct from old.membership_status
    or new.membership_expires_at is distinct from old.membership_expires_at
  ) and not public.can_manage_platform_state() then
    raise exception 'Solo la plataforma puede cambiar el estado de suspensión o membresía.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_platform_state on public.profiles;
create trigger protect_profile_platform_state
before update on public.profiles
for each row execute function public.protect_profile_platform_state();

create or replace function public.protect_organization_billing_state()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    new.billing_status is distinct from old.billing_status
    or new.current_period_end is distinct from old.current_period_end
    or new.suspended_at is distinct from old.suspended_at
    or new.suspended_reason is distinct from old.suspended_reason
  ) and not public.can_manage_platform_state() then
    raise exception 'Solo la plataforma puede cambiar el estado de facturación.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_organization_billing_state on public.organizations;
create trigger protect_organization_billing_state
before update on public.organizations
for each row execute function public.protect_organization_billing_state();

-- -----------------------------------------------------------------------------
-- RPC transaccional: suspender / reactivar un usuario (solo plataforma)
-- -----------------------------------------------------------------------------
create or replace function public.set_user_suspension(
  p_user_id uuid,
  p_suspended boolean,
  p_reason text default null,
  p_until timestamptz default null,
  p_membership_status text default null,
  p_organization_id uuid default null,
  p_actor_id uuid default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_id uuid := coalesce(auth.uid(), p_actor_id);
  v_membership_status text := p_membership_status;
begin
  if not public.can_manage_platform_state() then
    raise exception 'Solo un superadministrador puede cambiar el estado de un usuario.';
  end if;

  if p_suspended and v_membership_status is null then
    v_membership_status := case when p_until is null then 'suspended' else 'past_due' end;
  elsif not p_suspended and v_membership_status is null then
    v_membership_status := 'active';
  end if;

  if p_suspended then
    update public.profiles
       set is_suspended = true,
           suspended_at = now(),
           suspended_until = p_until,
           suspended_reason = nullif(btrim(coalesce(p_reason, '')), ''),
           suspended_by = v_actor_id,
           membership_status = v_membership_status
     where id = p_user_id;
  else
    update public.profiles
       set is_suspended = false,
           suspended_at = null,
           suspended_until = null,
           suspended_reason = null,
           suspended_by = v_actor_id,
           membership_status = v_membership_status
     where id = p_user_id;
  end if;

  if not found then
    raise exception 'El usuario no existe.';
  end if;

  insert into public.user_suspension_history (
    user_id, organization_id, action, reason, suspended_until, actor_id
  ) values (
    p_user_id,
    p_organization_id,
    case when p_suspended then 'suspended' else 'reactivated' end,
    nullif(btrim(coalesce(p_reason, '')), ''),
    case when p_suspended then p_until else null end,
    v_actor_id
  );
end;
$$;

grant execute on function public.set_user_suspension(uuid, boolean, text, timestamptz, text, uuid, uuid) to authenticated, service_role;

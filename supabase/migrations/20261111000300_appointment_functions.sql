-- =============================================================================
-- AgendaPro — Lógica transaccional de citas
-- La validación de disponibilidad "fina" se calcula en el servidor (TS), pero
-- aquí se revalidan reglas duras y la restricción EXCLUDE evita solapamientos.
-- =============================================================================

set search_path = public, extensions;

create or replace function public._insert_appointment(
  p_organization_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_employee_id uuid,
  p_starts_at timestamptz,
  p_status public.appointment_status,
  p_source text,
  p_created_by uuid,
  p_notes text,
  p_public_token uuid
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_service public.services;
  v_settings public.organization_settings;
  v_buffer integer;
  v_ends timestamptz;
  v_appointment public.appointments;
begin
  select * into v_service
  from public.services
  where id = p_service_id and organization_id = p_organization_id and deleted_at is null;

  if not found then
    raise exception 'SERVICE_NOT_FOUND';
  end if;

  select * into v_settings from public.organization_settings where organization_id = p_organization_id;
  if not found then
    raise exception 'SETTINGS_NOT_FOUND';
  end if;

  v_buffer := greatest(v_service.buffer_minutes, v_settings.buffer_minutes);
  v_ends := p_starts_at + make_interval(mins => v_service.duration_minutes + v_buffer);

  begin
    insert into public.appointments (
      organization_id, client_id, service_id, employee_id, starts_at, ends_at,
      duration_minutes, price, status, source, notes, created_by, public_token
    ) values (
      p_organization_id, p_client_id, p_service_id, p_employee_id, p_starts_at, v_ends,
      v_service.duration_minutes, v_service.price, p_status, p_source, p_notes, p_created_by,
      coalesce(p_public_token, gen_random_uuid())
    )
    returning * into v_appointment;
  exception
    when exclusion_violation then
      raise exception 'SLOT_CONFLICT' using errcode = 'P0001';
  end;

  insert into public.appointment_status_history (
    organization_id, appointment_id, from_status, to_status, changed_by, note
  ) values (
    p_organization_id, v_appointment.id, null, v_appointment.status, p_created_by, 'Cita creada'
  );

  return v_appointment;
end;
$$;

revoke all on function public._insert_appointment(uuid, uuid, uuid, uuid, timestamptz, public.appointment_status, text, uuid, text, uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Crear cita (panel o página pública)
-- -----------------------------------------------------------------------------
create or replace function public.create_appointment(
  p_organization_id uuid,
  p_client_id uuid,
  p_service_id uuid,
  p_employee_id uuid,
  p_starts_at timestamptz,
  p_notes text default null,
  p_source text default 'admin',
  p_created_by uuid default null
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_org public.organizations;
  v_settings public.organization_settings;
  v_service public.services;
  v_employee public.employees;
  v_client public.clients;
  v_status public.appointment_status;
  v_local timestamp;
  v_date date;
  v_weekday integer;
  v_exception public.schedule_exceptions;
  v_schedule public.employee_schedules;
  v_business public.business_hours;
begin
  select * into v_org from public.organizations where id = p_organization_id and deleted_at is null and is_active;
  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;

  if p_source not in ('admin', 'public') then raise exception 'INVALID_SOURCE'; end if;
  if p_starts_at <= now() then raise exception 'SLOT_IN_PAST'; end if;

  if p_created_by is not null then
    if not exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = p_created_by and m.is_active
        and m.role in ('owner', 'admin', 'receptionist')
    ) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  select * into v_client from public.clients
  where id = p_client_id and organization_id = p_organization_id and deleted_at is null;
  if not found then raise exception 'CLIENT_NOT_FOUND'; end if;

  select * into v_service from public.services
  where id = p_service_id and organization_id = p_organization_id and deleted_at is null and is_active;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  select * into v_employee from public.employees
  where id = p_employee_id and organization_id = p_organization_id and deleted_at is null and is_active;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;

  if not exists (
    select 1 from public.employee_services es
    where es.employee_id = p_employee_id and es.service_id = p_service_id
  ) then
    raise exception 'EMPLOYEE_SERVICE_MISMATCH';
  end if;

  select * into v_settings from public.organization_settings where organization_id = p_organization_id;
  if not found then raise exception 'SETTINGS_NOT_FOUND'; end if;

  if p_source = 'public' then
    if p_starts_at < now() + make_interval(mins => v_settings.min_notice_minutes) then
      raise exception 'MIN_NOTICE';
    end if;
    if p_starts_at > now() + make_interval(days => v_settings.max_advance_days) then
      raise exception 'MAX_ADVANCE';
    end if;

    v_local := p_starts_at at time zone v_org.timezone;
    v_date := v_local::date;
    v_weekday := extract(dow from v_local)::integer;

    select * into v_exception from public.schedule_exceptions e
    where e.organization_id = p_organization_id
      and e.exception_date = v_date
      and (e.employee_id is null or e.employee_id = p_employee_id)
    order by e.employee_id nulls last
    limit 1;

    if found then
      if v_exception.is_closed then
        raise exception 'DAY_CLOSED';
      end if;
      if v_local::time < v_exception.start_time
         or v_local::time + make_interval(mins => v_service.duration_minutes) > v_exception.end_time then
        raise exception 'OUTSIDE_HOURS';
      end if;
    end if;

    select * into v_schedule from public.employee_schedules s
    where s.employee_id = p_employee_id and s.weekday = v_weekday;

    if found then
      if not v_schedule.is_working
         or v_local::time < v_schedule.start_time
         or v_local::time + make_interval(mins => v_service.duration_minutes) > v_schedule.end_time then
        raise exception 'OUTSIDE_HOURS';
      end if;
    else
      select * into v_business from public.business_hours b
      where b.organization_id = p_organization_id and b.weekday = v_weekday;
      if not found or not v_business.is_open
         or v_local::time < v_business.open_time
         or v_local::time + make_interval(mins => v_service.duration_minutes) > v_business.close_time then
        raise exception 'OUTSIDE_HOURS';
      end if;
    end if;
  end if;

  v_status := case
    when v_settings.confirmation_mode = 'automatic' then 'confirmed'::public.appointment_status
    else 'pending'::public.appointment_status
  end;

  return public._insert_appointment(
    p_organization_id, p_client_id, p_service_id, p_employee_id, p_starts_at,
    v_status, p_source, p_created_by, p_notes, null
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Reprogramar (panel)
-- -----------------------------------------------------------------------------
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_actor uuid default null,
  p_reason text default null
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_duration interval;
  v_updated public.appointments;
begin
  select * into v_appointment from public.appointments
  where id = p_appointment_id and deleted_at is null;

  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'APPOINTMENT_NOT_RESCHEDULABLE';
  end if;
  if p_starts_at <= now() then raise exception 'SLOT_IN_PAST'; end if;

  if p_actor is not null then
    if not exists (
      select 1 from public.organization_members m
      where m.organization_id = v_appointment.organization_id and m.user_id = p_actor and m.is_active
        and m.role in ('owner', 'admin', 'receptionist')
    ) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  v_duration := v_appointment.ends_at - v_appointment.starts_at;

  begin
    update public.appointments
    set starts_at = p_starts_at, ends_at = p_starts_at + v_duration
    where id = p_appointment_id
    returning * into v_updated;
  exception
    when exclusion_violation then
      raise exception 'SLOT_CONFLICT' using errcode = 'P0001';
  end;

  insert into public.appointment_status_history (
    organization_id, appointment_id, from_status, to_status, changed_by, note
  ) values (
    v_appointment.organization_id, p_appointment_id, v_appointment.status, v_updated.status,
    p_actor, coalesce(p_reason, 'Cita reprogramada')
  );

  return v_updated;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cancelar (panel)
-- -----------------------------------------------------------------------------
create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_actor uuid default null,
  p_reason text default null
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_updated public.appointments;
begin
  select * into v_appointment from public.appointments
  where id = p_appointment_id and deleted_at is null;

  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'APPOINTMENT_NOT_CANCELLABLE';
  end if;

  if p_actor is not null then
    if not exists (
      select 1 from public.organization_members m
      where m.organization_id = v_appointment.organization_id and m.user_id = p_actor and m.is_active
        and m.role in ('owner', 'admin', 'receptionist')
    ) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  update public.appointments
  set status = 'cancelled', cancelled_at = now(), cancelled_by = p_actor,
      cancellation_reason = p_reason
  where id = p_appointment_id
  returning * into v_updated;

  insert into public.appointment_status_history (
    organization_id, appointment_id, from_status, to_status, changed_by, note
  ) values (
    v_appointment.organization_id, p_appointment_id, v_appointment.status, 'cancelled',
    p_actor, p_reason
  );

  return v_updated;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cancelar / reprogramar mediante token público
-- -----------------------------------------------------------------------------
create or replace function public.cancel_appointment_by_token(
  p_token uuid,
  p_reason text default null
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_settings public.organization_settings;
  v_updated public.appointments;
begin
  select * into v_appointment from public.appointments
  where public_token = p_token and deleted_at is null;

  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'APPOINTMENT_NOT_CANCELLABLE';
  end if;
  if v_appointment.starts_at <= now() then raise exception 'APPOINTMENT_ALREADY_STARTED'; end if;

  select * into v_settings from public.organization_settings
  where organization_id = v_appointment.organization_id;

  if found and v_settings.cancellation_notice_hours > 0
     and now() > v_appointment.starts_at - make_interval(hours => v_settings.cancellation_notice_hours) then
    raise exception 'CANCELLATION_WINDOW';
  end if;

  update public.appointments
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = coalesce(p_reason, 'Cancelada por el cliente')
  where id = v_appointment.id
  returning * into v_updated;

  insert into public.appointment_status_history (
    organization_id, appointment_id, from_status, to_status, changed_by, note
  ) values (
    v_appointment.organization_id, v_appointment.id, v_appointment.status, 'cancelled', null,
    coalesce(p_reason, 'Cancelada por el cliente')
  );

  return v_updated;
end;
$$;

create or replace function public.reschedule_appointment_by_token(
  p_token uuid,
  p_starts_at timestamptz
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_settings public.organization_settings;
  v_new public.appointments;
begin
  select * into v_appointment from public.appointments
  where public_token = p_token and deleted_at is null;

  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'APPOINTMENT_NOT_RESCHEDULABLE';
  end if;
  if p_starts_at <= now() then raise exception 'SLOT_IN_PAST'; end if;

  select * into v_settings from public.organization_settings
  where organization_id = v_appointment.organization_id;

  if found and v_settings.reschedule_notice_hours > 0
     and now() > v_appointment.starts_at - make_interval(hours => v_settings.reschedule_notice_hours) then
    raise exception 'RESCHEDULE_WINDOW';
  end if;

  v_new := public.create_appointment(
    v_appointment.organization_id,
    v_appointment.client_id,
    v_appointment.service_id,
    v_appointment.employee_id,
    p_starts_at,
    v_appointment.notes,
    'public',
    null
  );

  update public.appointments
  set status = 'cancelled', cancelled_at = now(),
      cancellation_reason = 'Reprogramada por el cliente'
  where id = v_appointment.id;

  insert into public.appointment_status_history (
    organization_id, appointment_id, from_status, to_status, changed_by, note
  ) values (
    v_appointment.organization_id, v_appointment.id, v_appointment.status, 'cancelled', null,
    'Reprogramada por el cliente'
  );

  return v_new;
end;
$$;

grant execute on function public.create_appointment(uuid, uuid, uuid, uuid, timestamptz, text, text, uuid) to authenticated, service_role;
grant execute on function public.reschedule_appointment(uuid, timestamptz, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_appointment(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_appointment_by_token(uuid, text) to service_role;
grant execute on function public.reschedule_appointment_by_token(uuid, timestamptz) to service_role;

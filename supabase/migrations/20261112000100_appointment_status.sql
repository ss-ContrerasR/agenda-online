-- =============================================================================
-- AgendaPro — Cambios de estado de citas (transaccional con historial)
-- =============================================================================

set search_path = public, extensions;

create or replace function public.set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status,
  p_actor uuid default null,
  p_note text default null
) returns public.appointments
language plpgsql security definer set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_updated public.appointments;
  v_allowed boolean := false;
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id and deleted_at is null;

  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;

  if p_actor is not null then
    if exists (
      select 1 from public.organization_members m
      where m.organization_id = v_appointment.organization_id
        and m.user_id = p_actor and m.is_active
        and m.role in ('owner', 'admin', 'receptionist')
    ) then
      v_allowed := true;
    elsif exists (
      select 1 from public.organization_members m
      where m.organization_id = v_appointment.organization_id
        and m.user_id = p_actor and m.is_active
        and m.role = 'employee'
        and m.employee_id = v_appointment.employee_id
    ) and p_status in ('completed', 'no_show') then
      v_allowed := true;
    end if;

    if not v_allowed then raise exception 'FORBIDDEN'; end if;
  end if;

  if v_appointment.status = p_status then
    return v_appointment;
  end if;

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception 'APPOINTMENT_STATUS_LOCKED';
  end if;

  update public.appointments
  set status = p_status,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      cancelled_by = case when p_status = 'cancelled' then p_actor else cancelled_by end,
      cancellation_reason = case when p_status = 'cancelled' then coalesce(p_note, cancellation_reason) else cancellation_reason end
  where id = p_appointment_id
  returning * into v_updated;

  insert into public.appointment_status_history (
    organization_id, appointment_id, from_status, to_status, changed_by, note
  ) values (
    v_appointment.organization_id, p_appointment_id, v_appointment.status, p_status,
    p_actor, p_note
  );

  return v_updated;
end;
$$;

revoke all on function public.set_appointment_status(uuid, public.appointment_status, uuid, text) from public, anon;
grant execute on function public.set_appointment_status(uuid, public.appointment_status, uuid, text) to authenticated, service_role;

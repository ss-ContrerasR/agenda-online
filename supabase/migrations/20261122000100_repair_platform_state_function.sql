-- =============================================================================
-- Reparación: helper platform_state faltante
-- =============================================================================
-- Algunas bases quedaron con el trigger `protect_organization_billing_state`
-- (migración de licencias) pero sin la función `can_manage_platform_state`
-- (migración de suspensión). En ese estado, CUALQUIER UPDATE en organizations
-- falla con:
--   function public.can_manage_platform_state() does not exist
--
-- Afecta a la carga del logo, a Apariencia y a la consola de licencias.
-- Esta migración es idempotente: si la función ya existe, la reemplaza por la
-- misma definición.
-- =============================================================================

create or replace function public.can_manage_platform_state()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_platform_admin()
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

grant execute on function public.can_manage_platform_state() to authenticated, service_role;

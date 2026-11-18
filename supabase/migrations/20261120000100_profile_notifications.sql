-- Bandeja de notificaciones in-app: estado de lectura y eliminación,
-- visibilidad para todo el equipo y suscripción Realtime.

alter table public.notifications
  add column if not exists read_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists notifications_inbox_idx
  on public.notifications (organization_id, created_at desc)
  where deleted_at is null and channel = 'in_app';

alter table public.notifications replica identity full;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select using (
  deleted_at is null
  and (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
    or public.is_platform_admin()
  )
);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update using (
  public.is_org_member(organization_id)
  or public.is_platform_admin()
)
with check (
  public.is_org_member(organization_id)
  or public.is_platform_admin()
);

-- La eliminación es lógica: las notificaciones desaparecen de la bandeja sin
-- borrar el historial de envíos por correo.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

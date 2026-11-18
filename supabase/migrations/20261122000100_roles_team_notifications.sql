-- =============================================================================
-- Roles operativos: recepción puede gestionar catálogo, equipo y configuración.
-- Las notificaciones internas de un empleado solo las ve él mismo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuración del negocio
-- -----------------------------------------------------------------------------
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update using (
  public.has_org_role(id, array['owner','admin','receptionist']::public.member_role[])
  or public.is_platform_admin()
)
with check (
  public.has_org_role(id, array['owner','admin','receptionist']::public.member_role[])
  or public.is_platform_admin()
);

drop policy if exists settings_update on public.organization_settings;
create policy settings_update on public.organization_settings
for update using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
  or public.is_platform_admin()
)
with check (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
  or public.is_platform_admin()
);

-- -----------------------------------------------------------------------------
-- Catálogo y equipo
-- -----------------------------------------------------------------------------
drop policy if exists categories_write on public.service_categories;
create policy categories_write on public.service_categories
for all using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
);

drop policy if exists services_write on public.services;
create policy services_write on public.services
for all using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
);

drop policy if exists employee_services_write on public.employee_services;
create policy employee_services_write on public.employee_services
for all using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
);

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
for insert with check (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
);

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
for update using (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
)
with check (
  public.has_org_role(organization_id, array['owner','admin','receptionist']::public.member_role[])
);

drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees
for delete using (
  public.has_org_role(organization_id, array['owner','admin']::public.member_role[])
);

-- -----------------------------------------------------------------------------
-- Notificaciones internas
-- Propietario, administrador y recepción ven toda la bandeja. Un empleado solo
-- ve los avisos internos de las citas que tiene asignadas (metadata).
-- -----------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select using (
  deleted_at is null
  and (
    public.has_org_role(
      organization_id,
      array['owner','admin','receptionist']::public.member_role[]
    )
    or (
      public.has_org_role(organization_id, array['employee']::public.member_role[])
      and channel = 'in_app'
      and (
        user_id = auth.uid()
        or metadata->>'employee_user_id' = auth.uid()::text
      )
    )
    or public.is_platform_admin()
  )
);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update using (
  public.has_org_role(
    organization_id,
    array['owner','admin','receptionist']::public.member_role[]
  )
  or (
    public.has_org_role(organization_id, array['employee']::public.member_role[])
    and channel = 'in_app'
    and (
      user_id = auth.uid()
      or metadata->>'employee_user_id' = auth.uid()::text
    )
  )
  or public.is_platform_admin()
)
with check (
  public.has_org_role(
    organization_id,
    array['owner','admin','receptionist']::public.member_role[]
  )
  or (
    public.has_org_role(organization_id, array['employee']::public.member_role[])
    and channel = 'in_app'
    and (
      user_id = auth.uid()
      or metadata->>'employee_user_id' = auth.uid()::text
    )
  )
  or public.is_platform_admin()
);

create index if not exists notifications_employee_inbox_idx
  on public.notifications ((metadata->>'employee_user_id'))
  where deleted_at is null and channel = 'in_app';

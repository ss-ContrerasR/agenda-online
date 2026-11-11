-- =============================================================================
-- AgendaPro — Datos de demostración
-- Usuarios demo (contraseña: Demo1234!)
--   owner@estudioaurora.com      → propietaria
--   recepcion@estudioaurora.com  → recepcionista
--   valeria@estudioaurora.com    → empleada
--   admin@agendapro.co           → superadministrador de plataforma
-- Este archivo se ejecuta con `supabase db reset`. No usar en producción.
-- =============================================================================

set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- Usuarios de autenticación demo
-- -----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  crypt('Demo1234!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('b1000000-0000-4000-8000-000000000001'::uuid, 'owner@estudioaurora.com', 'Laura Mendoza'),
  ('b1000000-0000-4000-8000-000000000002'::uuid, 'recepcion@estudioaurora.com', 'Paula Gómez'),
  ('b1000000-0000-4000-8000-000000000003'::uuid, 'valeria@estudioaurora.com', 'Valeria Ríos'),
  ('b1000000-0000-4000-8000-000000000009'::uuid, 'admin@agendapro.co', 'Admin AgendaPro'),
  ('b1000000-0000-4000-8000-000000000005'::uuid, 'owner@barberianorte.com', 'Mateo Salazar')
) as u(id, email, full_name)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.email,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(), now(), now()
from auth.users u
where u.id in (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000009',
  'b1000000-0000-4000-8000-000000000005'
)
on conflict do nothing;

insert into public.profiles (id, full_name, email)
select u.id, u.full_name, u.email
from auth.users u
where u.id in (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000009',
  'b1000000-0000-4000-8000-000000000005'
)
on conflict (id) do nothing;

insert into public.platform_admins (user_id)
values ('b1000000-0000-4000-8000-000000000009')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Organización demo principal
-- -----------------------------------------------------------------------------
insert into public.organizations (
  id, name, slug, description, logo_url, cover_url, phone, email, address, city, country, timezone, currency
) values (
  'a1000000-0000-4000-8000-000000000001',
  'Estudio Aurora',
  'estudio-aurora',
  'Estudio de belleza integral: cabello, uñas y spa. Un espacio diseñado para que salgas renovada.',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600&q=80',
  '+57 601 555 0142',
  'hola@estudioaurora.com',
  'Calle 85 # 12-34, Chapinero',
  'Bogotá',
  'Colombia',
  'America/Bogota',
  'COP'
);

insert into public.organization_settings (
  organization_id, confirmation_mode, min_notice_minutes, slot_interval_minutes, max_advance_days,
  buffer_minutes, cancellation_notice_hours, reschedule_notice_hours, policy_text,
  brand_primary, brand_secondary, brand_accent, theme_preset, public_about,
  public_hero_url, seo_title, seo_description,
  socials
) values (
  'a1000000-0000-4000-8000-000000000001',
  'automatic',
  120,
  15,
  60,
  10,
  24,
  12,
  'Puedes cancelar o reprogramar tu cita hasta 24 horas antes sin costo. Si no asistes, se aplicará un cargo del 50% del servicio.',
  '#0F766E',
  '#0EA5E9',
  '#F59E0B',
  'teal',
  'En Estudio Aurora combinamos técnica, calma y detalle. Nuestro equipo te acompaña con servicios personalizados para cabello, manos y rostro en un ambiente acogedor.',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80',
  'Estudio Aurora | Reserva tu cita de belleza en Bogotá',
  'Reserva en línea tu cita de cabello, uñas o spa en Estudio Aurora, Bogotá.',
  '{"instagram":"https://instagram.com","facebook":"https://facebook.com","whatsapp":"+573001234567"}'::jsonb
);

insert into public.organization_members (organization_id, user_id, role) values
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'owner'),
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'receptionist'),
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003', 'employee');

-- -----------------------------------------------------------------------------
-- Empleados
-- -----------------------------------------------------------------------------
insert into public.employees (id, organization_id, user_id, full_name, email, phone, photo_url, position, bio, specialties, color) values
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000003',
   'Valeria Ríos', 'valeria@estudioaurora.com', '+57 310 555 0101',
   'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
   'Estilista senior', 'Especialista en color y tratamientos capilares.',
   array['Coloración', 'Cortes', 'Tratamientos'], '#0F766E'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', null,
   'Camila Torres', 'camila@estudioaurora.com', '+57 310 555 0102',
   'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
   'Manicurista', 'Diseño de uñas y cuidado de manos y pies.',
   array['Uñas', 'Nail art'], '#0EA5E9'),
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', null,
   'Andrés Mejía', 'andres@estudioaurora.com', '+57 310 555 0103',
   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
   'Estilista', 'Cortes contemporáneos y color.',
   array['Cortes', 'Coloración'], '#8B5CF6'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', null,
   'Sofía Herrera', 'sofia@estudioaurora.com', '+57 310 555 0104',
   'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
   'Terapeuta spa', 'Faciales y masajes con enfoque relajante.',
   array['Faciales', 'Masajes'], '#F59E0B');

update public.organization_members
set employee_id = 'c1000000-0000-4000-8000-000000000001'
where organization_id = 'a1000000-0000-4000-8000-000000000001'
  and user_id = 'b1000000-0000-4000-8000-000000000003';

-- -----------------------------------------------------------------------------
-- Categorías y servicios
-- -----------------------------------------------------------------------------
insert into public.service_categories (id, organization_id, name, description, color, sort_order) values
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Cabello', 'Cortes, color y tratamientos', '#0F766E', 1),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Uñas', 'Manicure y pedicure', '#0EA5E9', 2),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'Spa', 'Faciales y masajes', '#F59E0B', 3);

insert into public.services (id, organization_id, category_id, name, description, price, duration_minutes, buffer_minutes, color, image_url, sort_order) values
  ('e1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'Corte y peinado', 'Diagnóstico, corte a tu medida y peinado con acabado profesional.', 45000, 45, 10, '#0F766E',
   'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80', 1),
  ('e1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001',
   'Coloración completa', 'Color de raíz a puntas con tratamiento de sellado.', 180000, 120, 15, '#0F766E',
   'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', 2),
  ('e1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002',
   'Manicure semipermanente', 'Preparación, esmaltado en gel y cuidado de cutícula.', 55000, 60, 10, '#0EA5E9',
   'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80', 3),
  ('e1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002',
   'Pedicure spa', 'Exfoliación, hidratación profunda y esmaltado.', 65000, 60, 10, '#0EA5E9',
   'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80', 4),
  ('e1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003',
   'Facial hidratante', 'Limpieza, exfoliación suave, mascarilla y masaje facial.', 120000, 75, 15, '#F59E0B',
   'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80', 5),
  ('e1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003',
   'Masaje relajante', 'Masaje corporal con aceites esenciales, 90 minutos.', 150000, 90, 15, '#F59E0B',
   'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80', 6);

insert into public.employee_services (organization_id, employee_id, service_id) values
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000004'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000002'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000005'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000006');

-- -----------------------------------------------------------------------------
-- Horarios
-- -----------------------------------------------------------------------------
insert into public.business_hours (organization_id, weekday, is_open, open_time, close_time, break_start, break_end)
select
  'a1000000-0000-4000-8000-000000000001',
  d,
  case when d = 0 then false else true end,
  '09:00',
  '19:00',
  case when d = 0 then null else '13:00'::time end,
  case when d = 0 then null else '14:00'::time end
from generate_series(0, 6) as d;

insert into public.employee_schedules (organization_id, employee_id, weekday, is_working, start_time, end_time)
select
  'a1000000-0000-4000-8000-000000000001',
  e.id,
  d,
  case
    when d = 0 then false
    when e.id = 'c1000000-0000-4000-8000-000000000001' and d = 1 then false
    when e.id = 'c1000000-0000-4000-8000-000000000003' and d = 3 then false
    else true
  end,
  '09:00',
  '19:00'
from public.employees e
cross join generate_series(0, 6) as d
where e.organization_id = 'a1000000-0000-4000-8000-000000000001';

insert into public.schedule_breaks (organization_id, employee_id, weekday, start_time, end_time, label) values
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 2, '15:00', '16:00', 'Terapia de espalda'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 6, '12:00', '13:00', 'Formación');

insert into public.schedule_exceptions (organization_id, employee_id, exception_date, is_closed, start_time, end_time, reason) values
  ('a1000000-0000-4000-8000-000000000001', null, current_date + 21, true, null, null, 'Festivo local'),
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', current_date + 10, true, null, null, 'Vacaciones'),
  ('a1000000-0000-4000-8000-000000000001', null, current_date + 3, false, '09:00', '15:00', 'Inventario y formación');

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
insert into public.clients (id, organization_id, full_name, email, phone, document, birth_date, address, notes, internal_notes, created_at)
select
  ('f1000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
  'a1000000-0000-4000-8000-000000000001',
  c.full_name,
  c.email,
  c.phone,
  c.document,
  c.birth_date,
  c.address,
  c.notes,
  c.internal_notes,
  now() - make_interval(days => n * 9)
from (values
  (1, 'Mariana López', 'mariana.lopez@example.com', '+57 300 111 2233', '1020304050', date '1992-04-18', 'Calle 70 # 5-12', 'Prefiere citas en la mañana.', 'Alergia a tintes con amoníaco.'),
  (2, 'Santiago Ramírez', 'santiago.ramirez@example.com', '+57 301 222 3344', '1030405060', date '1988-11-02', 'Carrera 15 # 80-20', null, 'Cliente frecuente de corte.'),
  (3, 'Isabella Vargas', 'isabella.vargas@example.com', '+57 302 333 4455', null, date '1995-07-25', 'Calle 90 # 11-08', 'Sensible al ruido.', null),
  (4, 'Daniela Castillo', 'daniela.castillo@example.com', '+57 303 444 5566', '1050607080', date '1990-02-14', 'Av. 19 # 114-05', null, 'Trabaja cerca, disponible a mediodía.'),
  (5, 'Andrés Felipe Mora', 'andres.mora@example.com', '+57 304 555 6677', null, date '1985-09-09', 'Calle 63 # 9-33', null, null),
  (6, 'Camila Ruiz', 'camila.ruiz@example.com', '+57 305 666 7788', null, date '1999-01-30', 'Calle 72 # 4-15', 'Le encanta el nail art.', 'Referida por Mariana López.'),
  (7, 'Julián Ospina', 'julian.ospina@example.com', '+57 306 777 8899', '1080901020', date '1993-06-12', 'Carrera 11 # 85-40', null, null),
  (8, 'Valentina Suárez', 'valentina.suarez@example.com', '+57 307 888 9900', null, date '1997-12-05', 'Calle 77 # 20-18', 'Prefiere productos veganos.', null),
  (9, 'Felipe Navarro', 'felipe.navarro@example.com', '+57 308 999 0011', null, date '1982-03-22', 'Calle 53 # 7-30', null, 'Cliente corporativo.'),
  (10, 'Sara Restrepo', 'sara.restrepo@example.com', '+57 309 000 1122', '1091011120', date '2000-08-17', 'Carrera 19 # 92-11', 'Primera visita por regalo.', null),
  (11, 'Tomás Giraldo', 'tomas.giraldo@example.com', '+57 310 121 3141', null, date '1991-10-28', 'Calle 66 # 13-02', null, null),
  (12, 'Luciana Pérez', 'luciana.perez@example.com', '+57 311 232 4252', null, date '1994-05-03', 'Carrera 7 # 70-45', 'Prefiere confirmación por WhatsApp.', 'Solicita siempre con Camila.')
) as c(n, full_name, email, phone, document, birth_date, address, notes, internal_notes);

-- -----------------------------------------------------------------------------
-- Citas (últimos 30 días y próximos 14 días)
-- -----------------------------------------------------------------------------
insert into public.appointments (
  id, organization_id, client_id, service_id, employee_id, starts_at, ends_at,
  duration_minutes, price, status, source, notes, created_at, public_token
)
select
  gen_random_uuid(),
  'a1000000-0000-4000-8000-000000000001',
  ('f1000000-0000-4000-8000-0000000000' || lpad((((d + 30) % 12) + 1)::text, 2, '0'))::uuid,
  svc.service_id,
  emp.employee_id,
  slot.start_local at time zone 'America/Bogota',
  (slot.start_local + make_interval(mins => svc.duration_minutes + svc.buffer_minutes)) at time zone 'America/Bogota',
  svc.duration_minutes,
  svc.price,
  case
    when d < 0 then
      case ((d + 30 + emp.employee_index + slot.slot_index) % 10)
        when 0 then 'cancelled'::public.appointment_status
        when 1 then 'no_show'::public.appointment_status
        else 'completed'::public.appointment_status
      end
    when d = 0 then
      case ((emp.employee_index + slot.slot_index) % 3)
        when 0 then 'confirmed'::public.appointment_status
        else 'pending'::public.appointment_status
      end
    else
      case ((d + emp.employee_index + slot.slot_index) % 6)
        when 0 then 'pending'::public.appointment_status
        else 'confirmed'::public.appointment_status
      end
  end,
  case when ((d + emp.employee_index) % 4 = 0) then 'public' else 'admin' end,
  null,
  case when d < 0 then now() - make_interval(days => abs(d) + 5) else now() - make_interval(days => 2) end,
  gen_random_uuid()
from generate_series(-30, 14) as d
cross join lateral (
  values
    (1, 'c1000000-0000-4000-8000-000000000001'::uuid, 'e1000000-0000-4000-8000-000000000001'::uuid),
    (2, 'c1000000-0000-4000-8000-000000000002'::uuid, 'e1000000-0000-4000-8000-000000000003'::uuid),
    (3, 'c1000000-0000-4000-8000-000000000003'::uuid, 'e1000000-0000-4000-8000-000000000001'::uuid),
    (4, 'c1000000-0000-4000-8000-000000000004'::uuid, 'e1000000-0000-4000-8000-000000000005'::uuid)
) as emp(employee_index, employee_id, service_id)
cross join lateral (
  select
    ((current_date + d)::timestamp + (case when e.id = emp.employee_id then time '09:00' else time '09:00' end) + make_interval(hours => slot_index * 3)) as start_local,
    slot_index
  from (values (0), (1)) as s(slot_index)
) as slot
join public.services svc on svc.id = emp.service_id
where extract(dow from (current_date + d)) <> 0
  and not (emp.employee_id = 'c1000000-0000-4000-8000-000000000001' and extract(dow from (current_date + d)) = 1)
  and not (emp.employee_id = 'c1000000-0000-4000-8000-000000000003' and extract(dow from (current_date + d)) = 3)
  and not ((current_date + d) = current_date + 21)
  and not (emp.employee_id = 'c1000000-0000-4000-8000-000000000004' and (current_date + d) between current_date + 10 and current_date + 12)
  and not ((current_date + d) = current_date + 3)
  and not (slot.slot_index = 1 and emp.employee_index = 4 and extract(dow from (current_date + d)) = 2)
  and (current_date + d) <> current_date
  and not exists (
    select 1 from public.appointments a
    where a.employee_id = emp.employee_id
      and a.status in ('pending', 'confirmed')
      and tstzrange(
        slot.start_local at time zone 'America/Bogota',
        (slot.start_local + make_interval(mins => svc.duration_minutes + svc.buffer_minutes)) at time zone 'America/Bogota',
        '[)'
      ) && tstzrange(a.starts_at, a.ends_at, '[)')
  );

-- Citas de hoy para el dashboard
insert into public.appointments (
  id, organization_id, client_id, service_id, employee_id, starts_at, ends_at,
  duration_minutes, price, status, source, notes, created_at, public_token
) values
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
   (current_date::timestamp + time '10:00') at time zone 'America/Bogota',
   (current_date::timestamp + time '10:45') at time zone 'America/Bogota', 45, 45000, 'confirmed', 'admin', null, now() - interval '3 days', gen_random_uuid()),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002',
   (current_date::timestamp + time '11:30') at time zone 'America/Bogota',
   (current_date::timestamp + time '12:30') at time zone 'America/Bogota', 60, 55000, 'confirmed', 'public', 'Uñas tono nude', now() - interval '2 days', gen_random_uuid()),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004',
   (current_date::timestamp + time '15:00') at time zone 'America/Bogota',
   (current_date::timestamp + time '16:15') at time zone 'America/Bogota', 75, 120000, 'pending', 'public', null, now() - interval '1 day', gen_random_uuid()),
  (gen_random_uuid(), 'a1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000003',
   (current_date::timestamp + time '16:30') at time zone 'America/Bogota',
   (current_date::timestamp + time '18:30') at time zone 'America/Bogota', 120, 180000, 'confirmed', 'admin', null, now() - interval '5 days', gen_random_uuid());

insert into public.appointment_status_history (organization_id, appointment_id, from_status, to_status, changed_by, note, created_at)
select organization_id, id, null, status, created_by, 'Historial de demostración', created_at
from public.appointments
where organization_id = 'a1000000-0000-4000-8000-000000000001';

-- -----------------------------------------------------------------------------
-- Notificaciones y auditoría de ejemplo
-- -----------------------------------------------------------------------------
insert into public.notifications (organization_id, appointment_id, type, channel, recipient, title, body, status, created_at)
select
  organization_id,
  id,
  'appointment_confirmed',
  'email',
  'owner@estudioaurora.com',
  'Cita confirmada',
  'Se confirmó una cita para ' || to_char(starts_at at time zone 'America/Bogota', 'DD/MM/YYYY HH24:MI') || '.',
  'sent',
  created_at + interval '1 minute'
from public.appointments
where organization_id = 'a1000000-0000-4000-8000-000000000001'
order by created_at desc
limit 5;

insert into public.audit_logs (organization_id, user_id, action, entity, entity_id, metadata, created_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'organization.created', 'organizations', 'a1000000-0000-4000-8000-000000000001', '{}', now() - interval '40 days'),
  ('a1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'appearance.updated', 'organization_settings', 'a1000000-0000-4000-8000-000000000001', '{"theme":"teal"}', now() - interval '12 days');

-- -----------------------------------------------------------------------------
-- Segunda organización (demuestra aislamiento multiempresa)
-- -----------------------------------------------------------------------------
insert into public.organizations (
  id, name, slug, description, phone, email, address, city, timezone, currency
) values (
  'a1000000-0000-4000-8000-000000000002',
  'Barbería Norte',
  'barberia-norte',
  'Barbería clásica con actitud moderna.',
  '+57 601 555 0188',
  'hola@barberianorte.com',
  'Calle 116 # 15-20',
  'Bogotá',
  'America/Bogota',
  'COP'
);

insert into public.organization_settings (
  organization_id, brand_primary, brand_secondary, brand_accent, theme_preset, public_about
) values (
  'a1000000-0000-4000-8000-000000000002', '#1E293B', '#C2410C', '#F59E0B', 'midnight',
  'Cortes clásicos, fades precisos y buena conversación.'
);

insert into public.organization_members (organization_id, user_id, role) values
  ('a1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000005', 'owner');

insert into public.employees (id, organization_id, full_name, position, specialties, color)
values ('c1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002', 'Mateo Salazar', 'Barbero', array['Fade', 'Barba'], '#1E293B');

insert into public.service_categories (id, organization_id, name, color)
values ('d1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000002', 'Barbería', '#1E293B');

insert into public.services (id, organization_id, category_id, name, price, duration_minutes, color)
values ('e1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000004', 'Corte + barba', 60000, 60, '#1E293B');

insert into public.employee_services (organization_id, employee_id, service_id)
values ('a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000007');

insert into public.business_hours (organization_id, weekday, is_open, open_time, close_time)
select 'a1000000-0000-4000-8000-000000000002', d, d <> 0, '10:00', '19:00'
from generate_series(0, 6) as d;

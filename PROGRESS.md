# Estado del proyecto — AgendaTEX (SaaS de citas)

## Completado

### Base
- [x] Inspección del proyecto (Next.js 16.4.5, React 19, Tailwind 4, TS estricto).
- [x] Dependencias base: Supabase, Zod, RHF, Recharts, Radix/shadcn, date-fns, Resend, Vitest.
- [x] Esquema PostgreSQL + RLS + funciones + triggers + índices.
- [x] Autenticación, organizaciones, onboarding y permisos por rol.
- [x] Design system, layout del panel y tema por organización.

### Módulos
- [x] Dashboard con KPIs, gráficos, filtros por período y actividad reciente.
- [x] Citas: CRUD, vistas mes/semana/día/listado, estados con historial, reprogramación.
- [x] Clientes: CRUD, ficha con historial y estadísticas.
- [x] Servicios y categorías, con sección independiente de categorías
      (`/dashboard/categorias`) para crearlas, editarlas, ordenarlas y eliminarlas.
- [x] Equipo: “Agregar personal” desde cuentas con rol Empleado, ficha del
      profesional, horarios, vacaciones, servicios asignados y estadísticas.
- [x] Horarios del negocio y excepciones.
- [x] Reportes con exportación CSV.
- [x] Configuración del negocio.
- [x] Apariencia persistida (colores, portada, logo, SEO).
- [x] Usuarios y roles con alcance por rol: propietario/administrador con control
      total, recepción con operación y empleado solo con sus citas y avisos.
      Indicadores de cuenta vinculada o pendiente de agregar al equipo.
- [x] Superadmin de plataforma (empresas, licencias, usuarios, auditoría).
- [x] Reserva pública en `/reservar/[slug]` + gestión por token seguro.
- [x] Directorio público de negocios en `/negocios`.
- [x] Notificaciones por Resend (solo si hay credenciales) y arquitectura lista para WhatsApp.
- [x] Notificaciones internas por empleado (`metadata.employee_user_id` + RLS),
      aviso flotante rediseñado con acciones y panel filtrado para empleados.
- [x] Correos personalizables con React Email: editor de diseño (logo, colores,
      textos, disposición), vista previa en servidor y envío manual con el correo
      del propietario como remitente/respuesta.

### Rendimiento
- [x] `next.config.ts`: `poweredByHeader: false`, `optimizePackageImports`
      (`recharts`, `lucide-react`, `date-fns`), `staleTimes`, imágenes
      AVIF/WebP, `qualities`, `minimumCacheTTL` y `deviceSizes`/`imageSizes`.
- [x] `proxy.ts` limitado a rutas con sesión; las páginas públicas ya no
      validan sesión en cada visita.
- [x] Fuentes con `display: "swap"` y Geist Mono sin precarga.
- [x] `AppImage`: optimización con `next/image` para hosts seguros y fallback
      nativo lazy para URLs externas/SVG.
- [x] Carga diferida de `BookingWizard`, `OverviewCharts` (Recharts),
      `CommandPalette`, `GuidedTour`, `GlobalHelp` y `AppointmentCalendar`.
- [x] `loading.tsx` con skeletons compartidos en las rutas principales del panel.
- [x] Consultas del dashboard acotadas a columnas necesarias y sin conteos
      innecesarios.
- [x] Catálogo público cacheado con `"use cache"`, `cacheTag` y `cacheLife`,
      invalidado desde las acciones de servicios, empleados, horarios,
      configuración y apariencia.
- [x] Endpoint `/api/search` real para el command palette, con sesión, RLS y
      búsquedas acotadas por organización.
- [x] Directorio público con `useDeferredValue` para filtrar sin bloquear.
- [x] Migración `20261119000100_performance_indexes.sql` con `pg_trgm` e
      índices compuestos/parciales para agenda, clientes, empleados, servicios
      y organizaciones.

## Pendiente
- [ ] Ampliar pruebas automatizadas (Vitest): disponibilidad, rangos de fecha,
      permisos, schemas, conflictos/duplicados, cancelación y reprogramación.
- [ ] Configurar credenciales reales de Resend en producción.
- [ ] Integración de WhatsApp (la arquitectura ya está preparada).

## Decisiones técnicas
- Multi-tenant por `organization_id` + RLS con helpers SECURITY DEFINER.
- Reservas protegidas por `EXCLUDE USING gist` (sin solapamientos por empleado) + RPC transaccional.
- Disponibilidad calculada en servidor (TypeScript, zona horaria de la organización) y validada de nuevo en PostgreSQL.
- Tema por organización mediante variables CSS inyectadas desde `organization_settings`.
- Operaciones públicas (reserva/gestión por token) usan cliente service-role solo en el servidor, con validación Zod y alcance por organización.
- Mutaciones del panel usan el cliente de sesión (RLS); el service-role solo se
  usa para auditoría y notificaciones.
- Formularios admin con `useActionState` + `FormData` + Zod en servidor.
- Fechas de negocio con `date-fns-tz` y la zona horaria de la organización.
- Imágenes externas fuera de los hosts permitidos usan `<img>` nativo para no
  abrir el optimizador a dominios arbitrarios.

## Notas de despliegue
- Ejecutar `supabase db reset` (o aplicar las migraciones) para incluir los
  índices de rendimiento, la tabla `email_templates` y el seed actualizado.
- La sección `/dashboard/correos` requiere la migración
  `20261121000100_email_templates.sql`. Sin ella, el panel no podrá cargar la
  plantilla.
- Los roles de recepción y las notificaciones por empleado requieren la migración
  `20261122000100_roles_team_notifications.sql`.
- Si `SUPABASE_SERVICE_ROLE_KEY` no está configurada, una recepcionista no podrá
  vincular la cuenta con la ficha del equipo (RLS de `organization_members`);
  propietario y administrador sí pueden hacerlo con su propia sesión.
- Si el seed ya se había ejecutado, el superadmin conserva el correo anterior;
  actualizarlo en Supabase Auth o resetear la base para usar
  `admin@agendatex.co`.
- Sin credenciales de Resend las notificaciones quedan como `skipped`; nunca se
  simula el envío.

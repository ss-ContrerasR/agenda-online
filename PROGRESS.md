# Estado del proyecto — AgendaPro (SaaS de citas)

## Completado
- [x] Inspección del proyecto (Next.js 16.4.5, React 19, Tailwind 4, TS estricto).
- [x] Dependencias base: Supabase, Zod, RHF, Recharts, Radix/shadcn, date-fns, Resend, Vitest.

## En curso
- [ ] Esquema PostgreSQL + RLS + funciones.
- [ ] Autenticación, organizaciones y permisos.
- [ ] Design system y layout del panel.
- [ ] Módulos: citas, clientes, servicios, empleados, horarios.
- [ ] Motor de disponibilidad + página pública.
- [ ] Reportes, apariencia, notificaciones.
- [ ] Seeds, pruebas, README.

## Decisiones técnicas
- Multi-tenant por `organization_id` + RLS con helpers SECURITY DEFINER.
- Reservas protegidas por `EXCLUDE USING gist` (sin solapamientos por empleado) + RPC transaccional.
- Disponibilidad calculada en servidor (TypeScript, zona horaria de la organización) y validada de nuevo en PostgreSQL.
- Tema por organización mediante variables CSS inyectadas desde `organization_settings`.
- Operaciones públicas (reserva/gestión por token) usan cliente service-role solo en el servidor, con validación Zod y alcance por organización.

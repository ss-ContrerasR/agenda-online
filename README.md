# AgendaTEX

SaaS multi-tenant de agendamiento y reservas en línea. Permite a cada negocio
gestionar citas, clientes, servicios, empleados, horarios, reportes y su propia
página pública de reservas.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Cache Components)
- **TypeScript** estricto
- **Tailwind CSS 4** + **shadcn/ui** (Radix)
- **Supabase** (Postgres, Auth, Storage, RLS)
- **Zod** + **React Hook Form**
- **Recharts**, **Lucide**, **date-fns / date-fns-tz**
- **React Email** (`@react-email/components` + `@react-email/render`) para plantillas de correo
- **Brevo** (plan gratuito, sin dominio propio) o **Resend** para correo (opcional)

## Requisitos

- Node.js 20+
- pnpm
- Un proyecto de Supabase (o Supabase CLI local)

## Configuración

1. Instala dependencias:

   ```bash
   pnpm install
   ```

2. Crea `.env.local` con:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Opcionales
   # Brevo: gratis y sin dominio propio (300 correos/día)
   BREVO_API_KEY=
   BREVO_FROM_EMAIL=AgendaTEX <tu-correo-verificado@gmail.com>
   # Alternativa con dominio verificado
   RESEND_API_KEY=
   RESEND_FROM_EMAIL=AgendaTEX <no-reply@tudominio.com>
   NEXT_PUBLIC_PLATFORM_WHATSAPP_NUMBER=
   ```

   Si Brevo está configurado se usa como proveedor principal; Resend queda como
   alternativa. Sin ninguno de los dos, las notificaciones quedan en estado
   `skipped`; la app nunca simula envíos.

3. Aplica el esquema y el seed:

   ```bash
   supabase db reset
   ```

   o ejecuta en orden los archivos de `supabase/migrations/` y luego
   `supabase/seed.sql`.

4. Arranca el entorno de desarrollo:

   ```bash
   pnpm dev
   ```

## Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |

## Rutas principales

- `/` — landing pública
- `/negocios` — directorio de negocios activos
- `/reservar/[slug]` — reserva pública del negocio
- `/reservar/[slug]/cita/[token]` — gestión de una cita por token
- `/dashboard` — panel del negocio (según rol)
- `/dashboard/citas` — agenda del negocio; un empleado solo ve sus citas
- `/dashboard/servicios` — catálogo de servicios
- `/dashboard/categorias` — gestión independiente de categorías del catálogo
- `/dashboard/empleados` — equipo y alta de personal desde cuentas Empleado
- `/dashboard/usuarios` — cuentas, roles y vinculación con el equipo
- `/dashboard/notificaciones` — avisos internos; un empleado solo ve los suyos
- `/dashboard/correos` — editor y envío de correos (propietario, admin y recepción)
- `/admin` — panel de plataforma (superadmin)
- `/login`, `/registro`, `/onboarding` — autenticación y alta de negocio

## Roles y acceso

- **Propietario y administrador**: control total del panel, incluida la gestión
  de usuarios, la configuración y la vinculación del personal.
- **Recepcionista**: citas, clientes, servicios, categorías, equipo, reportes,
  correos, configuración, notificaciones y su perfil. Puede crear y editar
  catálogo y personal, pero no administrar cuentas ni roles.
- **Empleado**: inicia sesión con su propia cuenta y solo ve las citas que tiene
  asignadas, su detalle y sus notificaciones. Puede completar o marcar
  “No asistió” sus citas; confirmar, cancelar, reprogramar o eliminar queda en
  manos de propietario, administrador o recepción.

Las cuentas se crean en **Usuarios y roles**. Si el rol es Empleado, la cuenta
queda pendiente hasta que se agregue como personal en **Equipo → Agregar
personal**, donde se crea la ficha del profesional y se vincula
`organization_members.employee_id`. Esa vinculación es la que usa RLS para
mostrarle únicamente sus propias citas y avisos.

## Arquitectura y seguridad

- Aislamiento multi-tenant real con `organization_id` y **RLS** en todas las
  tablas; la UI nunca es la única barrera.
- Las mutaciones del panel usan el cliente de sesión (RLS). El cliente
  `service-role` se usa solo en el servidor para operaciones públicas por token,
  auditoría y notificaciones.
- Las reservas se protegen en base de datos con una restricción `EXCLUDE USING
  gist` (sin solapamientos por empleado) y una RPC transaccional.
- La disponibilidad se calcula en el servidor con la zona horaria del negocio y
  se revalida en PostgreSQL.
- Los tokens de gestión de citas son aleatorios y no exponen datos de otros
  negocios.

## Correos personalizables

- La sección **Correos** (`/dashboard/correos`) está disponible para
  propietario, administrador y recepcionista mediante los permisos
  `email:read`, `email:write` y `email:send`.
- La plantilla se guarda por organización en `email_templates` (una fila por
  `organization_id`, con RLS). Incluye diseño (`classic`, `compact`, `minimal`),
  logo, colores, encabezado, pie, botón y enlaces sociales.
- La vista previa y los correos reales usan el mismo componente de **React
  Email**, renderizado en el servidor. No hay HTML duplicado entre la vista
  previa y el envío.
- El remitente es el correo del propietario (miembro `owner` → `profiles.email`).
  Si su dominio coincide con `BREVO_FROM_EMAIL` (o `RESEND_FROM_EMAIL`), se usa
  como `from`; si no, se envía desde el remitente verificado de la plataforma y
  el correo del propietario se usa como `reply_to`.
- **Brevo** es la opción recomendada sin dominio propio: permite verificar un
  correo individual y enviar a cualquier destinatario con 300 correos/día
  gratis. Crea la cuenta en [brevo.com](https://www.brevo.com), verifica el
  remitente en **Senders**, genera una API key y define `BREVO_API_KEY` y
  `BREVO_FROM_EMAIL`.
- Si Brevo responde `unrecognised IP address`, autoriza la IP del servidor en
  [Security → Authorised IPs](https://app.brevo.com/security/authorised_ips) o
  desactiva **Block unknown IP addresses**. En producción conviene usar una IP
  de salida fija, porque las IPs dinámicas cambian y Brevo las bloquea.
- **Resend** sigue disponible como alternativa, pero para enviar a terceros
  exige un dominio verificado.
- Sin proveedor configurado el envío devuelve `skipped` y la UI lo explica;
  nunca se simula un envío. Cada intento queda registrado en `notifications`.

## Rendimiento

- Imágenes optimizadas con `next/image` (AVIF/WebP) para Supabase y Unsplash;
  URLs externas caen a `<img>` lazy mediante `components/shared/app-image.tsx`.
- JS pesado (Recharts, asistente de reservas, calendario, command palette y
  tours) se carga de forma diferida.
- `proxy.ts` solo intercepta rutas que requieren sesión.
- El catálogo público y el directorio se cachean con etiquetas e se invalidan
  desde las acciones del panel.
- Skeletons por ruta (`loading.tsx`) para navegación con streaming.
- Índices compuestos, parciales y `pg_trgm` para las consultas más frecuentes
  (`supabase/migrations/20261119000100_performance_indexes.sql`).

## Pruebas

```bash
pnpm test
```

Vitest cubre hoy el alta de usuarios y roles, el manejo de errores de acciones y
el campo de logo de la organización. La suite seguirá creciendo con
disponibilidad, conflictos y reprogramación; ver `PROGRESS.md`.

## Despliegue

- Define las variables de entorno en el proveedor (Vercel u otro).
- Ejecuta las migraciones y el seed en el proyecto de Supabase de producción.
- Configura `NEXT_PUBLIC_APP_URL` con el dominio final para que los enlaces de
  los correos apunten correctamente.

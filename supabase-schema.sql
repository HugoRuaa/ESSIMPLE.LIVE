-- ====================================================================
-- essimple.live — Esquema SQL para Supabase (Plan de Pago / Pro)
-- Esquema dedicado: "essimple"
-- Sin Supabase Auth: Registro y autenticación gestionados 100% por código.
-- ====================================================================

-- 0. Crear el esquema personalizado essimple
create schema if not exists essimple;

-- Otorgar permisos al rol anon, authenticated y service_role sobre el esquema essimple
grant usage on schema essimple to anon, authenticated, service_role;
grant all on all tables in schema essimple to anon, authenticated, service_role;
grant all on all sequences in schema essimple to anon, authenticated, service_role;
grant all on all routines in schema essimple to anon, authenticated, service_role;

alter default privileges in schema essimple grant all on tables to anon, authenticated, service_role;
alter default privileges in schema essimple grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema essimple grant all on routines to anon, authenticated, service_role;

-- 1. Tabla de Familias (Cuentas familiares gestionadas por código)
create table if not exists essimple.familias (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  exit_pin text not null default '1234',
  person_name text not null default 'Álvaro',
  font_size text not null default 'grande' check (font_size in ('normal', 'grande', 'muy_grande')),
  country_code text not null default '57',
  quick_messages text[] not null default array['Ya llegué', 'Llámame por favor', 'Todo bien', 'Estoy en camino'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabla de Contactos (máximo 20 por familia, hasta 5 de emergencia)
create table if not exists essimple.contactos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  name text not null,
  phone text not null,
  photo_url text,
  avatar_color text not null default '#0b4f9e',
  is_emergency boolean not null default false,
  is_safe_zone boolean not null default false,
  is_low_battery boolean not null default false,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabla de Casa y Zona Segura
create table if not exists essimple.casa_zona (
  familia_id uuid primary key references essimple.familias(id) on delete cascade,
  home_address text not null default 'Calle 10 # 43A-25, El Poblado, Medellín',
  home_lat double precision not null default 6.2088,
  home_lng double precision not null default -75.5684,
  travel_mode text not null default 'pie' check (travel_mode in ('pie', 'transporte')),
  safe_zone_active boolean not null default true,
  safe_zone_lat double precision not null default 6.2088,
  safe_zone_lng double precision not null default -75.5684,
  safe_zone_address text not null default 'Calle 10 # 43A-25, El Poblado, Medellín',
  safe_zone_radius integer not null default 300 check (safe_zone_radius between 100 and 5000),
  updated_at timestamptz not null default now()
);

-- 4. Tabla de Estado del Teléfono (batería, conexión, versión)
create table if not exists essimple.estado_telefono (
  familia_id uuid primary key references essimple.familias(id) on delete cascade,
  is_online boolean not null default true,
  battery_level integer not null default 78 check (battery_level between 0 and 100),
  is_charging boolean not null default false,
  app_version text not null default '0.1.0-alpha',
  missing_permissions text[] not null default '{}',
  is_home_screen boolean not null default true,
  last_reported_at timestamptz not null default now()
);

-- 5. Tabla de Historial de Eventos (SOS, caídas, zona segura, batería, audios)
create table if not exists essimple.eventos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text not null,
  level text not null default 'normal' check (level in ('danger', 'warning', 'normal')),
  failed_contacts text[],
  created_at timestamptz not null default now()
);

-- 6. Tabla de Historial de Cambios de la Familia
create table if not exists essimple.cambios (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);

-- 7. Tabla de Mensajes de Voz temporales
create table if not exists essimple.mensajes_voz (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  token text unique not null,
  recipient_name text not null,
  duration_seconds integer not null default 0,
  audio_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- 8. Tabla de Enlaces de Instalación temporales (72 horas)
create table if not exists essimple.enlaces_instalacion (
  token text primary key,
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours')
);

-- Habilitar RLS en todas las tablas del esquema essimple
alter table essimple.familias enable row level security;
alter table essimple.contactos enable row level security;
alter table essimple.casa_zona enable row level security;
alter table essimple.estado_telefono enable row level security;
alter table essimple.eventos enable row level security;
alter table essimple.cambios enable row level security;
alter table essimple.mensajes_voz enable row level security;
alter table essimple.enlaces_instalacion enable row level security;

-- Políticas para permitir acceso anónimo directo (seguridad basada en ID de familia / código)
create policy "Acceso familias por anon" on essimple.familias for all using (true) with check (true);
create policy "Acceso contactos por anon" on essimple.contactos for all using (true) with check (true);
create policy "Acceso casa_zona por anon" on essimple.casa_zona for all using (true) with check (true);
create policy "Acceso estado_telefono por anon" on essimple.estado_telefono for all using (true) with check (true);
create policy "Acceso eventos por anon" on essimple.eventos for all using (true) with check (true);
create policy "Acceso cambios por anon" on essimple.cambios for all using (true) with check (true);
create policy "Acceso mensajes_voz por anon" on essimple.mensajes_voz for all using (true) with check (true);
create policy "Acceso enlaces_instalacion por anon" on essimple.enlaces_instalacion for all using (true) with check (true);

-- ====================================================================
-- NOTA IMPORTANTE PARA SUPABASE:
-- En el panel de Supabase ve a:
-- Project Settings -> API -> "Exposed schemas"
-- y añade "essimple" a la lista para que la API REST (PostgREST) pueda consultarlo.
-- ====================================================================

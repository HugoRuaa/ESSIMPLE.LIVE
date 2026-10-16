-- ====================================================================
-- essimple.live — Fase 1 de seguridad (PARA REVISAR; NO se ha ejecutado)
-- Ejecutar en el SQL Editor de Supabase, de arriba abajo, cuando Hugo lo apruebe.
--
-- Modelo:
--  1) Familia (panel web): Supabase Auth con correo y clave. Sin confirmación de correo
--     y sin recuperación de clave. Cada familia solo ve y edita lo suyo (RLS por dueño).
--  2) Teléfono: no tiene correo ni clave. Se vincula con un código de un solo uso
--     (15 min) y recibe un token aleatorio. Solo guarda el hash del token. Solo puede
--     usar las funciones dispositivo_*; no puede leer ni escribir tablas.
--  3) Contactos que reciben avisos: pendiente (fase 3). push_suscripciones y
--     vinculos_pendientes siguen como están hasta entonces (deuda declarada).
--
-- Efecto al ejecutar: los APK ya instalados dejan de poder escribir en las tablas
-- (usan la llave pública directa). Ejecutar SOLO cuando el APK nuevo esté listo
-- y las 10 familias avisadas (corte limpio acordado).
--
-- Ajustes manuales en el panel de Supabase (no se pueden hacer por SQL):
--  - Authentication > Providers > Email: DESACTIVAR "Confirm email".
--  - Authentication > Policies: longitud mínima de clave 10; activar "Leaked password
--    protection" si el plan lo permite.
--  - Authentication > Rate limits: dejar los límites de inicio de sesión y registro por defecto o más bajos.
--  - No poner ningún botón ni flujo de "olvidé mi clave" (decisión de Hugo).
-- ====================================================================

create extension if not exists pgcrypto with schema extensions;

-- --------------------------------------------------------------------
-- 1. Columnas nuevas
-- --------------------------------------------------------------------
alter table essimple.familias add column if not exists owner_id uuid unique references auth.users(id) on delete cascade;
alter table essimple.familias add column if not exists exit_pin_hash text;
alter table essimple.familias add column if not exists pin_fallos integer not null default 0;
alter table essimple.familias add column if not exists pin_bloqueado_hasta timestamptz;
alter table essimple.estado_telefono add column if not exists is_sharing boolean not null default false;

-- La clave y el PIN en claro dejan de existir (corte limpio). Se quitan al final (paso 9).

create table if not exists essimple.dispositivos (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table if not exists essimple.codigos_vinculo (
  code_hash bytea primary key,
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at timestamptz
);

create table if not exists essimple.intentos_vinculo (
  at timestamptz not null default now()
);

alter table essimple.dispositivos enable row level security;
alter table essimple.codigos_vinculo enable row level security;
alter table essimple.intentos_vinculo enable row level security;
-- Sin políticas: nadie con llave pública o de sesión toca estas tablas. Solo las funciones.

-- --------------------------------------------------------------------
-- 2. Cierre de las tablas al público
-- --------------------------------------------------------------------
drop policy if exists "Acceso familias por anon" on essimple.familias;
drop policy if exists "Acceso contactos por anon" on essimple.contactos;
drop policy if exists "Acceso casa_zona por anon" on essimple.casa_zona;
drop policy if exists "Acceso estado_telefono por anon" on essimple.estado_telefono;
drop policy if exists "estado_telefono_acceso" on essimple.estado_telefono;
drop policy if exists "Acceso eventos por anon" on essimple.eventos;
drop policy if exists "Acceso cambios por anon" on essimple.cambios;
drop policy if exists "Acceso mensajes_voz por anon" on essimple.mensajes_voz;
drop policy if exists "Acceso enlaces_instalacion por anon" on essimple.enlaces_instalacion;

revoke all on essimple.familias, essimple.contactos, essimple.casa_zona, essimple.estado_telefono,
  essimple.eventos, essimple.cambios, essimple.mensajes_voz, essimple.enlaces_instalacion,
  essimple.dispositivos, essimple.codigos_vinculo, essimple.intentos_vinculo
  from anon, authenticated;

-- Que las tablas nuevas que se creen en el futuro no queden abiertas por defecto.
alter default privileges in schema essimple revoke all on tables from anon, authenticated;
alter default privileges in schema essimple revoke execute on functions from public, anon, authenticated;

-- --------------------------------------------------------------------
-- 3. Familia autenticada: solo lo suyo
-- --------------------------------------------------------------------
create or replace function essimple.mi_familia() returns uuid
language sql stable security definer set search_path = essimple, pg_temp as $$
  select id from essimple.familias where owner_id = auth.uid()
$$;
revoke all on function essimple.mi_familia() from public, anon;
grant execute on function essimple.mi_familia() to authenticated;

-- familias: sin acceso a pin ni contadores
grant select (id, email, person_name, font_size, country_code, quick_messages, created_at, updated_at)
  on essimple.familias to authenticated;
grant update (person_name, font_size, country_code, quick_messages, updated_at)
  on essimple.familias to authenticated;
create policy familias_ver on essimple.familias for select to authenticated using (owner_id = auth.uid());
create policy familias_editar on essimple.familias for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on essimple.contactos to authenticated;
create policy contactos_propios on essimple.contactos for all to authenticated
  using (familia_id = essimple.mi_familia()) with check (familia_id = essimple.mi_familia());

grant select, insert, update, delete on essimple.casa_zona to authenticated;
create policy casa_zona_propia on essimple.casa_zona for all to authenticated
  using (familia_id = essimple.mi_familia()) with check (familia_id = essimple.mi_familia());

grant select on essimple.estado_telefono to authenticated;
create policy estado_ver on essimple.estado_telefono for select to authenticated
  using (familia_id = essimple.mi_familia());

grant select, insert on essimple.eventos to authenticated;
create policy eventos_ver on essimple.eventos for select to authenticated using (familia_id = essimple.mi_familia());
create policy eventos_crear on essimple.eventos for insert to authenticated with check (familia_id = essimple.mi_familia());

grant select, insert on essimple.cambios to authenticated;
create policy cambios_ver on essimple.cambios for select to authenticated using (familia_id = essimple.mi_familia());
create policy cambios_crear on essimple.cambios for insert to authenticated with check (familia_id = essimple.mi_familia());

-- mensajes_voz y enlaces_instalacion: sin políticas para nadie (la interfaz no los usa).

-- Solo se conservan los últimos 50 eventos y 50 cambios por familia (lo que dice la política).
create or replace function essimple._recortar_50() returns trigger
language plpgsql security definer set search_path = essimple, pg_temp as $$
begin
  execute format(
    'delete from essimple.%I where familia_id = $1 and id not in (select id from essimple.%I where familia_id = $1 order by created_at desc limit 50)',
    tg_table_name, tg_table_name) using new.familia_id;
  return null;
end $$;
drop trigger if exists eventos_recortar on essimple.eventos;
create trigger eventos_recortar after insert on essimple.eventos for each row execute function essimple._recortar_50();
drop trigger if exists cambios_recortar on essimple.cambios;
create trigger cambios_recortar after insert on essimple.cambios for each row execute function essimple._recortar_50();

-- --------------------------------------------------------------------
-- 4. Alta de la familia (después de auth.signUp) y borrado de cuenta
-- --------------------------------------------------------------------
create or replace function essimple.crear_mi_familia(p_person_name text, p_pin text)
returns uuid language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'El PIN debe tener 4 números'; end if;
  select id into v_id from essimple.familias where owner_id = auth.uid();
  if v_id is not null then return v_id; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into essimple.familias (owner_id, email, password_hash, person_name, exit_pin_hash)
    values (auth.uid(), lower(v_email), '-', left(coalesce(nullif(trim(p_person_name), ''), 'Mi familiar'), 20),
            crypt(p_pin, gen_salt('bf', 8)))
    returning id into v_id;
  insert into essimple.casa_zona (familia_id, safe_zone_active) values (v_id, false);
  insert into essimple.estado_telefono (familia_id) values (v_id);
  return v_id;
end $$;

create or replace function essimple.cambiar_pin(p_pin text) returns void
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'El PIN debe tener 4 números'; end if;
  update essimple.familias set exit_pin_hash = crypt(p_pin, gen_salt('bf', 8)),
    pin_fallos = 0, pin_bloqueado_hasta = null, updated_at = now()
    where owner_id = auth.uid();
end $$;

-- Borra todo: familia, contactos, casa, estado, eventos, cambios, teléfonos y la cuenta de acceso.
create or replace function essimple.eliminar_mi_cuenta() returns void
language plpgsql security definer set search_path = essimple, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  delete from essimple.push_suscripciones where familia_id = (select id from essimple.familias where owner_id = auth.uid());
  delete from auth.users where id = auth.uid();   -- borra en cascada la familia y todo lo suyo
end $$;

-- --------------------------------------------------------------------
-- 5. Vincular el teléfono (código de un solo uso -> token)
-- --------------------------------------------------------------------
-- La familia pide un código de 8 caracteres, válido 15 minutos. Se muestra una vez.
create or replace function essimple.crear_codigo_vinculo() returns text
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare
  v_fam uuid := essimple.mi_familia();
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- 31 sin O,0,I,1,L
  v_bytes bytea; v_code text := ''; i int;
begin
  if v_fam is null then raise exception 'Sin familia'; end if;
  delete from essimple.codigos_vinculo where expires_at < now() - interval '1 day';
  v_bytes := gen_random_bytes(8);
  for i in 0..7 loop
    v_code := v_code || substr(v_alfabeto, (get_byte(v_bytes, i) % 31) + 1, 1);
  end loop;
  insert into essimple.codigos_vinculo (code_hash, familia_id) values (digest(v_code, 'sha256'), v_fam);
  return v_code;
end $$;

-- El teléfono canjea el código. Devuelve el token (se guarda en el teléfono) o null.
-- Límite global: 30 códigos mal escritos por 10 minutos.
create or replace function essimple.vincular_dispositivo(p_code text) returns text
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare v_fam uuid; v_hash bytea := digest(upper(trim(coalesce(p_code, ''))), 'sha256'); v_token text;
begin
  delete from essimple.intentos_vinculo where at < now() - interval '1 hour';
  if (select count(*) from essimple.intentos_vinculo where at > now() - interval '10 minutes') >= 30 then
    raise exception 'Demasiados intentos. Espera unos minutos.';
  end if;
  update essimple.codigos_vinculo set used_at = now()
    where code_hash = v_hash and used_at is null and expires_at > now()
    returning familia_id into v_fam;
  if v_fam is null then
    insert into essimple.intentos_vinculo default values;
    return null;
  end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into essimple.dispositivos (familia_id, token_hash) values (v_fam, digest(v_token, 'sha256'));
  return v_token;
end $$;

-- La familia desvincula todos los teléfonos (el botón "Desvincular" hoy solo muestra un aviso).
create or replace function essimple.desvincular_telefonos() returns void
language sql security definer set search_path = essimple, pg_temp as $$
  update essimple.dispositivos set revoked_at = now()
    where familia_id = essimple.mi_familia() and revoked_at is null
$$;

-- --------------------------------------------------------------------
-- 6. Funciones del teléfono (solo con token válido)
-- --------------------------------------------------------------------
create or replace function essimple._familia_de_token(p_token text) returns uuid
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare v_fam uuid;
begin
  update essimple.dispositivos set last_seen_at = now()
    where token_hash = digest(coalesce(p_token, ''), 'sha256') and revoked_at is null
    returning familia_id into v_fam;
  if v_fam is null then raise exception 'Dispositivo no autorizado' using errcode = '28000'; end if;
  return v_fam;
end $$;
revoke all on function essimple._familia_de_token(text) from public, anon, authenticated;

-- Lo que el teléfono necesita para funcionar. No incluye el correo ni el PIN.
create or replace function essimple.dispositivo_config(p_token text) returns jsonb
language plpgsql security definer set search_path = essimple, pg_temp as $$
declare v_fam uuid := essimple._familia_de_token(p_token);
begin
  return jsonb_build_object(
    'familia', (select to_jsonb(f) from (select person_name, font_size, country_code, quick_messages
                  from essimple.familias where id = v_fam) f),
    'casa', (select to_jsonb(c) - 'familia_id' from essimple.casa_zona c where c.familia_id = v_fam),
    'contactos', coalesce((select jsonb_agg(to_jsonb(k) - 'familia_id' order by k.display_order)
                  from essimple.contactos k where k.familia_id = v_fam), '[]'::jsonb));
end $$;

-- Estado y última ubicación (una sola fila por familia, sin historial).
create or replace function essimple.dispositivo_reportar(
  p_token text, p_online boolean, p_battery integer, p_charging boolean, p_app_version text,
  p_missing text[], p_home_screen boolean, p_sharing boolean,
  p_lat double precision default null, p_lng double precision default null, p_accuracy integer default null)
returns void language plpgsql security definer set search_path = essimple, pg_temp as $$
declare v_fam uuid := essimple._familia_de_token(p_token);
begin
  insert into essimple.estado_telefono as e (familia_id, is_online, battery_level, is_charging, app_version,
      missing_permissions, is_home_screen, is_sharing, last_lat, last_lng, last_accuracy, last_location_at, last_reported_at)
    values (v_fam, coalesce(p_online, true), greatest(0, least(100, coalesce(p_battery, 0))), coalesce(p_charging, false),
      left(coalesce(p_app_version, ''), 30), coalesce(p_missing, '{}'), coalesce(p_home_screen, true), coalesce(p_sharing, false),
      p_lat, p_lng, p_accuracy, case when p_lat is not null then now() end, now())
  on conflict (familia_id) do update set
      is_online = excluded.is_online, battery_level = excluded.battery_level, is_charging = excluded.is_charging,
      app_version = excluded.app_version, missing_permissions = excluded.missing_permissions,
      is_home_screen = excluded.is_home_screen, is_sharing = excluded.is_sharing,
      last_lat = coalesce(excluded.last_lat, e.last_lat), last_lng = coalesce(excluded.last_lng, e.last_lng),
      last_accuracy = coalesce(excluded.last_accuracy, e.last_accuracy),
      last_location_at = coalesce(excluded.last_location_at, e.last_location_at),
      last_reported_at = now();
end $$;

-- Aviso desde el teléfono (SOS, zona segura, batería). El disparador de avisos sigue igual.
create or replace function essimple.dispositivo_evento(
  p_token text, p_type text, p_title text, p_detail text, p_level text default 'normal', p_failed text[] default null)
returns void language plpgsql security definer set search_path = essimple, pg_temp as $$
declare v_fam uuid := essimple._familia_de_token(p_token);
begin
  insert into essimple.eventos (familia_id, event_type, title, detail, level, failed_contacts)
    values (v_fam, left(coalesce(p_type, 'evento'), 40), left(coalesce(p_title, ''), 120),
            left(coalesce(p_detail, ''), 500),
            case when p_level in ('danger', 'warning', 'normal') then p_level else 'normal' end, p_failed);
end $$;

-- Pregunta si el PIN escrito en el teléfono es el correcto. Bloquea 15 min tras 5 fallos.
-- Aviso honesto: un PIN de 4 números es una traba para la persona acompañada, no una defensa fuerte.
create or replace function essimple.dispositivo_verificar_pin(p_token text, p_pin text) returns jsonb
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare v_fam uuid := essimple._familia_de_token(p_token); f essimple.familias;
begin
  select * into f from essimple.familias where id = v_fam for update;
  if f.pin_bloqueado_hasta is not null and f.pin_bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'bloqueado', true);
  end if;
  if f.exit_pin_hash is not null and f.exit_pin_hash = crypt(coalesce(p_pin, ''), f.exit_pin_hash) then
    update essimple.familias set pin_fallos = 0, pin_bloqueado_hasta = null where id = v_fam;
    return jsonb_build_object('ok', true, 'bloqueado', false);
  end if;
  update essimple.familias set
      pin_fallos = case when pin_fallos + 1 >= 5 then 0 else pin_fallos + 1 end,
      pin_bloqueado_hasta = case when pin_fallos + 1 >= 5 then now() + interval '15 minutes' end
    where id = v_fam;
  return jsonb_build_object('ok', false, 'bloqueado', f.pin_fallos + 1 >= 5);
end $$;

-- --------------------------------------------------------------------
-- 7. Permisos de las funciones
-- --------------------------------------------------------------------
revoke all on function essimple.crear_mi_familia(text, text), essimple.cambiar_pin(text),
  essimple.eliminar_mi_cuenta(), essimple.crear_codigo_vinculo(), essimple.desvincular_telefonos(),
  essimple.vincular_dispositivo(text), essimple.dispositivo_config(text),
  essimple.dispositivo_reportar(text, boolean, integer, boolean, text, text[], boolean, boolean, double precision, double precision, integer),
  essimple.dispositivo_evento(text, text, text, text, text, text[]),
  essimple.dispositivo_verificar_pin(text, text)
  from public, anon, authenticated;

grant execute on function essimple.crear_mi_familia(text, text), essimple.cambiar_pin(text),
  essimple.eliminar_mi_cuenta(), essimple.crear_codigo_vinculo(), essimple.desvincular_telefonos()
  to authenticated;

grant execute on function essimple.vincular_dispositivo(text), essimple.dispositivo_config(text),
  essimple.dispositivo_reportar(text, boolean, integer, boolean, text, text[], boolean, boolean, double precision, double precision, integer),
  essimple.dispositivo_evento(text, text, text, text, text, text[]),
  essimple.dispositivo_verificar_pin(text, text)
  to anon;

-- --------------------------------------------------------------------
-- 8. Comprobaciones (correr después; deben dar 0 filas / false)
-- --------------------------------------------------------------------
-- select tablename, policyname, roles, qual from pg_policies where schemaname = 'essimple' order by 1, 2;
-- select has_table_privilege('anon', 'essimple.familias', 'select');       -- false
-- select has_table_privilege('anon', 'essimple.contactos', 'select');      -- false
-- select has_table_privilege('authenticated', 'essimple.dispositivos', 'select'); -- false
-- select has_column_privilege('authenticated', 'essimple.familias', 'exit_pin_hash', 'select'); -- false

-- --------------------------------------------------------------------
-- 9. Paso final, solo tras comprobar que todo funciona (borra la clave y el PIN en claro)
-- --------------------------------------------------------------------
-- alter table essimple.familias drop column password_hash;
-- alter table essimple.familias drop column exit_pin;

notify pgrst, 'reload schema';

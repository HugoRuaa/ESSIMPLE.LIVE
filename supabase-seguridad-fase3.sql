-- ====================================================================
-- essimple.live — Fase 3 de seguridad: avisos a los contactos (PARA REVISAR; NO ejecutado)
-- Correr después de supabase-seguridad.sql y los parches 1 y 2.
--
-- Hoy el enlace de aviso lleva el id de la familia y el teléfono (/avisos/<familia>/<teléfono>) y la tabla
-- push_suscripciones está abierta a la llave pública. Con esto:
--  - Cada enlace lleva un token aleatorio propio (solo se guarda su hash) que identifica a UN contacto.
--  - El celular del contacto solo puede usar tres funciones: ver el nombre de la persona, activar y desactivar avisos.
--  - push_suscripciones se cierra: solo la función de envío (clave de servicio) la lee.
--  - Si se borra un contacto, se revocan sus enlaces y se eliminan sus suscripciones.
-- Los enlaces viejos (/avisos/<familia>/<teléfono>) dejan de servir: hay que enviar enlaces nuevos desde el panel.
-- ====================================================================

create table if not exists essimple.avisos_enlaces (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  phone_digits text not null,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists avisos_enlaces_familia_idx on essimple.avisos_enlaces (familia_id);
alter table essimple.avisos_enlaces enable row level security;
revoke all on essimple.avisos_enlaces from anon, authenticated;

-- La familia crea el enlace de un contacto. Devuelve el token (se muestra una sola vez dentro del enlace).
create or replace function essimple.crear_enlace_aviso(p_phone text) returns text
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare
  v_fam uuid := essimple.mi_familia();
  v_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_token text;
begin
  if v_fam is null then raise exception 'Sin familia'; end if;
  if length(v_digits) < 7 or length(v_digits) > 15 then raise exception 'Teléfono no válido'; end if;
  if (select count(*) from essimple.avisos_enlaces where familia_id = v_fam and revoked_at is null) >= 100 then
    raise exception 'Demasiados enlaces activos';
  end if;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into essimple.avisos_enlaces (familia_id, phone_digits, token_hash)
    values (v_fam, v_digits, digest(v_token, 'sha256'));
  return v_token;
end $$;

create or replace function essimple._enlace_aviso(p_token text) returns essimple.avisos_enlaces
language sql stable security definer set search_path = essimple, extensions, pg_temp as $$
  select * from essimple.avisos_enlaces
   where token_hash = digest(coalesce(p_token, ''), 'sha256') and revoked_at is null
$$;
revoke all on function essimple._enlace_aviso(text) from public, anon, authenticated;

-- El celular del contacto pregunta a quién cuida (solo el nombre).
create or replace function essimple.aviso_info(p_token text) returns jsonb
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare e essimple.avisos_enlaces := essimple._enlace_aviso(p_token);
begin
  if e.id is null then return null; end if;
  return jsonb_build_object('person_name', (select person_name from essimple.familias where id = e.familia_id));
end $$;

-- Activar avisos: guarda el registro de notificaciones de ese celular.
create or replace function essimple.aviso_suscribir(p_token text, p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare e essimple.avisos_enlaces := essimple._enlace_aviso(p_token);
begin
  if e.id is null then raise exception 'Enlace no válido' using errcode = '28000'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(coalesce(p_p256dh, '')) > 200 or length(coalesce(p_auth, '')) > 100 then
    raise exception 'Datos no válidos';
  end if;
  insert into essimple.push_suscripciones (familia_id, phone_digits, endpoint, p256dh, auth)
    values (e.familia_id, e.phone_digits, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set familia_id = excluded.familia_id, phone_digits = excluded.phone_digits,
    p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- Desactivar avisos en ese celular.
create or replace function essimple.aviso_baja(p_token text, p_endpoint text) returns void
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare e essimple.avisos_enlaces := essimple._enlace_aviso(p_token);
begin
  if e.id is null then return; end if;
  delete from essimple.push_suscripciones where endpoint = p_endpoint and familia_id = e.familia_id;
end $$;

-- Al borrar un contacto (o cambiarle el número) se revocan sus enlaces y se eliminan sus suscripciones (si ningún otro contacto usa el número).
create or replace function essimple._revocar_aviso_contacto() returns trigger
language plpgsql security definer set search_path = essimple, pg_temp as $$
declare v_last10 text := right(regexp_replace(old.phone, '\D', '', 'g'), 10);
begin
  if v_last10 = '' then return old; end if;
  -- Si solo cambió el formato del mismo número, no se revoca nada.
  if tg_op = 'UPDATE' and right(regexp_replace(new.phone, '\D', '', 'g'), 10) = v_last10 then return new; end if;
  if exists (select 1 from essimple.contactos c
              where c.familia_id = old.familia_id and c.id <> old.id
                and right(regexp_replace(c.phone, '\D', '', 'g'), 10) = v_last10) then
    return old;
  end if;
  update essimple.avisos_enlaces set revoked_at = now()
    where familia_id = old.familia_id and revoked_at is null and right(phone_digits, 10) = v_last10;
  delete from essimple.push_suscripciones
    where familia_id = old.familia_id and right(regexp_replace(phone_digits, '\D', '', 'g'), 10) = v_last10;
  return coalesce(new, old);
end $$;
drop trigger if exists contactos_revocar_aviso on essimple.contactos;
create trigger contactos_revocar_aviso after delete on essimple.contactos
  for each row execute function essimple._revocar_aviso_contacto();
drop trigger if exists contactos_revocar_aviso_upd on essimple.contactos;
create trigger contactos_revocar_aviso_upd after update of phone on essimple.contactos
  for each row execute function essimple._revocar_aviso_contacto();

-- Cierre de push_suscripciones: nadie con llave pública ni sesión la toca. La función de envío usa la clave de servicio.
drop policy if exists "push_suscripciones_acceso" on essimple.push_suscripciones;
revoke all on essimple.push_suscripciones from anon, authenticated;

revoke all on function essimple.crear_enlace_aviso(text), essimple.aviso_info(text),
  essimple.aviso_suscribir(text, text, text, text), essimple.aviso_baja(text, text) from public, anon, authenticated;
grant execute on function essimple.crear_enlace_aviso(text) to authenticated;
grant execute on function essimple.aviso_info(text), essimple.aviso_suscribir(text, text, text, text),
  essimple.aviso_baja(text, text) to anon, authenticated;

notify pgrst, 'reload schema';

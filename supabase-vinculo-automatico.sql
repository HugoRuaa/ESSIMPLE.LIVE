-- Vinculación automática al descargar el APK (ejecutar una vez en Supabase > SQL Editor)
-- La tabla queda cerrada: solo se toca a través de las 3 funciones de abajo.
-- La IP la lee el servidor de la cabecera de la petición, el cliente no puede falsificarla.

create table if not exists essimple.vinculos_pendientes (
  id uuid primary key default gen_random_uuid(),
  familia_email text not null,
  ip text not null,
  created_at timestamptz not null default now(),
  used boolean not null default false
);
create index if not exists vinculos_pendientes_ip_idx on essimple.vinculos_pendientes (ip, created_at desc);
alter table essimple.vinculos_pendientes enable row level security;
-- Sin políticas a propósito: anon no puede leer ni escribir la tabla directamente.

create or replace function essimple._ip_cliente() returns text
language sql stable as $$
  select nullif(trim(split_part(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), '')
$$;

-- 1) La página essimple.live/d/<código> llama a esta función al empezar la descarga.
create or replace function essimple.registrar_descarga(p_email text) returns boolean
language plpgsql security definer set search_path = essimple, public as $$
declare
  v_ip text := essimple._ip_cliente();
  v_email text := lower(trim(p_email));
begin
  if v_ip is null or v_email is null or v_email = '' then return false; end if;
  if not exists (select 1 from essimple.familias where email = v_email) then return false; end if;
  delete from essimple.vinculos_pendientes where created_at < now() - interval '2 days';
  if (select count(*) from essimple.vinculos_pendientes where ip = v_ip and created_at > now() - interval '1 hour') >= 20 then
    return false;
  end if;
  insert into essimple.vinculos_pendientes (familia_email, ip) values (v_email, v_ip);
  return true;
end $$;

-- 2) La app, al abrirse por primera vez, pregunta si hay una descarga reciente desde su misma IP.
--    Solo devuelve el correo cuando hay una única familia candidata.
create or replace function essimple.buscar_vinculo() returns json
language plpgsql security definer set search_path = essimple, public as $$
declare
  v_ip text := essimple._ip_cliente();
  v_emails text[];
begin
  if v_ip is null then return json_build_object('count', 0, 'email', null); end if;
  select array_agg(distinct familia_email) into v_emails
  from essimple.vinculos_pendientes
  where ip = v_ip and not used and created_at > now() - interval '24 hours';
  if v_emails is null then return json_build_object('count', 0, 'email', null); end if;
  if array_length(v_emails, 1) = 1 then
    return json_build_object('count', 1, 'email', v_emails[1]);
  end if;
  return json_build_object('count', array_length(v_emails, 1), 'email', null);
end $$;

-- 3) Se llama cuando la persona confirma, para que la solicitud no se use dos veces.
create or replace function essimple.marcar_vinculo_usado(p_email text) returns void
language sql security definer set search_path = essimple, public as $$
  update essimple.vinculos_pendientes set used = true
  where ip = essimple._ip_cliente() and familia_email = lower(trim(p_email));
$$;

revoke all on function essimple.registrar_descarga(text), essimple.buscar_vinculo(), essimple.marcar_vinculo_usado(text) from public;
grant execute on function essimple.registrar_descarga(text), essimple.buscar_vinculo(), essimple.marcar_vinculo_usado(text) to anon, authenticated;

-- Para que la API vea las funciones nuevas sin esperar
notify pgrst, 'reload schema';

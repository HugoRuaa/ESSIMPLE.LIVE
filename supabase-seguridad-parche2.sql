-- essimple.live — Parche 2 de la fase 1 (correr UNA vez, después de supabase-seguridad.sql y parche 1).
-- PIN comprobable sin señal: el teléfono recibe el hash (bcrypt) del PIN y lo verifica por su cuenta.
-- También sube el costo del hash de los PIN nuevos. Los PIN que ya existen siguen valiendo.

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
            crypt(p_pin, gen_salt('bf', 10)))
    returning id into v_id;
  insert into essimple.casa_zona (familia_id, safe_zone_active) values (v_id, false);
  insert into essimple.estado_telefono (familia_id) values (v_id);
  return v_id;
end $$;

create or replace function essimple.cambiar_pin(p_pin text) returns void
language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'El PIN debe tener 4 números'; end if;
  update essimple.familias set exit_pin_hash = crypt(p_pin, gen_salt('bf', 10)),
    pin_fallos = 0, pin_bloqueado_hasta = null, updated_at = now()
    where owner_id = auth.uid();
end $$;

create or replace function essimple.dispositivo_config(p_token text) returns jsonb
language plpgsql security definer set search_path = essimple, pg_temp as $$
declare v_fam uuid := essimple._familia_de_token(p_token);
begin
  return jsonb_build_object(
    'familia', (select to_jsonb(f) from (select person_name, font_size, country_code, quick_messages
                  from essimple.familias where id = v_fam) f),
    -- Copia con hash del PIN (bcrypt) para comprobarlo en el teléfono aunque no haya señal.
    'pin_hash', (select exit_pin_hash from essimple.familias where id = v_fam),
    'casa', (select to_jsonb(c) - 'familia_id' from essimple.casa_zona c where c.familia_id = v_fam),
    'contactos', coalesce((select jsonb_agg(to_jsonb(k) - 'familia_id' order by k.display_order)
                  from essimple.contactos k where k.familia_id = v_fam), '[]'::jsonb));
end $$;

notify pgrst, 'reload schema';

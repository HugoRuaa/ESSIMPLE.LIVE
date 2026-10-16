-- essimple.live — Limpieza del esquema viejo (corte limpio). DESTRUCTIVO: no se puede deshacer.
-- Correr SOLO después de: supabase-seguridad.sql + parche1, con copia de seguridad hecha,
-- y cuando el cliente nuevo ya esté publicado.
--
-- Qué hace:
--  1) Borra las familias del esquema viejo (las que no tienen cuenta de acceso nueva) y, en cascada,
--     sus contactos, casa, estado, eventos, cambios y suscripciones. Cada familia debe registrarse de nuevo.
--     Es necesario: el correo es único y la familia nueva no puede crearse si queda la vieja.
--  2) Quita las columnas password_hash y exit_pin (claves y PIN en claro o con hash sin sal).

delete from essimple.familias where owner_id is null;

-- Vinculación vieja por correo + IP: ya no se usa. Se borran la tabla (correos e IP de descargas) y las
-- funciones, porque buscar_vinculo() entregaba el correo de una familia a cualquiera en la misma red.
drop function if exists essimple.registrar_descarga(text), essimple.buscar_vinculo(),
  essimple.marcar_vinculo_usado(text), essimple._ip_cliente();
drop table if exists essimple.vinculos_pendientes;

-- La función de alta ya no escribe password_hash.
create or replace function essimple.crear_mi_familia(p_person_name text, p_pin text)
returns uuid language plpgsql security definer set search_path = essimple, extensions, pg_temp as $$
declare v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'El PIN debe tener 4 números'; end if;
  select id into v_id from essimple.familias where owner_id = auth.uid();
  if v_id is not null then return v_id; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into essimple.familias (owner_id, email, person_name, exit_pin_hash)
    values (auth.uid(), lower(v_email), left(coalesce(nullif(trim(p_person_name), ''), 'Mi familiar'), 20),
            crypt(p_pin, gen_salt('bf', 10)))
    returning id into v_id;
  insert into essimple.casa_zona (familia_id, safe_zone_active) values (v_id, false);
  insert into essimple.estado_telefono (familia_id) values (v_id);
  return v_id;
end $$;

alter table essimple.familias drop column if exists password_hash;
alter table essimple.familias drop column if exists exit_pin;

-- Que toda familia tenga dueño de ahora en adelante.
alter table essimple.familias alter column owner_id set not null;

notify pgrst, 'reload schema';

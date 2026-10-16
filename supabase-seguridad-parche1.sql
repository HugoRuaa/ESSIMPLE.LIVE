-- essimple.live — Parche 1 de la fase 1 (correr UNA vez, después de supabase-seguridad.sql).
-- 1) El teléfono puede reportar solo una parte del estado (lo que llega vacío se deja como estaba).
-- 2) Las funciones del teléfono también sirven a un navegador que tenga sesión de familia.

create or replace function essimple.dispositivo_reportar(
  p_token text, p_online boolean default null, p_battery integer default null, p_charging boolean default null,
  p_app_version text default null, p_missing text[] default null, p_home_screen boolean default null,
  p_sharing boolean default null,
  p_lat double precision default null, p_lng double precision default null, p_accuracy integer default null)
returns void language plpgsql security definer set search_path = essimple, pg_temp as $$
declare v_fam uuid := essimple._familia_de_token(p_token);
begin
  insert into essimple.estado_telefono (familia_id) values (v_fam) on conflict (familia_id) do nothing;
  update essimple.estado_telefono set
      is_online = coalesce(p_online, is_online),
      battery_level = coalesce(greatest(0, least(100, p_battery)), battery_level),
      is_charging = coalesce(p_charging, is_charging),
      app_version = coalesce(left(p_app_version, 30), app_version),
      missing_permissions = coalesce(p_missing, missing_permissions),
      is_home_screen = coalesce(p_home_screen, is_home_screen),
      is_sharing = coalesce(p_sharing, is_sharing),
      last_lat = coalesce(p_lat, last_lat),
      last_lng = coalesce(p_lng, last_lng),
      last_accuracy = coalesce(p_accuracy, last_accuracy),
      last_location_at = case when p_lat is not null and p_lng is not null then now() else last_location_at end,
      last_reported_at = now()
    where familia_id = v_fam;
end $$;

grant execute on function essimple.vincular_dispositivo(text), essimple.dispositivo_config(text),
  essimple.dispositivo_reportar(text, boolean, integer, boolean, text, text[], boolean, boolean, double precision, double precision, integer),
  essimple.dispositivo_evento(text, text, text, text, text, text[]),
  essimple.dispositivo_verificar_pin(text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';

-- essimple.live: seguimiento del teléfono (última ubicación conocida)
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- Se guarda UNA sola ubicación por familia (la última). No hay historial de recorridos.

alter table essimple.estado_telefono add column if not exists last_lat double precision;
alter table essimple.estado_telefono add column if not exists last_lng double precision;
alter table essimple.estado_telefono add column if not exists last_accuracy integer;
alter table essimple.estado_telefono add column if not exists last_location_at timestamptz;

grant all on essimple.estado_telefono to anon, authenticated, service_role;

notify pgrst, 'reload schema';

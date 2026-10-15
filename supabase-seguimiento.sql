-- essimple.live: seguimiento del teléfono (última ubicación conocida)
-- Ejecutar en el SQL Editor de Supabase. Se puede correr más de una vez sin problema.
-- Se guarda UNA sola ubicación por familia (la última). No hay historial de recorridos.

alter table essimple.estado_telefono add column if not exists last_lat double precision;
alter table essimple.estado_telefono add column if not exists last_lng double precision;
alter table essimple.estado_telefono add column if not exists last_accuracy integer;
alter table essimple.estado_telefono add column if not exists last_location_at timestamptz;

-- Acceso: sin esto el celular no puede guardar y el panel no puede leer.
alter table essimple.estado_telefono enable row level security;
drop policy if exists "estado_telefono_acceso" on essimple.estado_telefono;
create policy "estado_telefono_acceso" on essimple.estado_telefono
  for all to anon, authenticated using (true) with check (true);

grant usage on schema essimple to anon, authenticated, service_role;
grant all on essimple.estado_telefono to anon, authenticated, service_role;

-- La app también registra avisos (zona, batería) en eventos.
grant all on essimple.eventos to anon, authenticated, service_role;

notify pgrst, 'reload schema';

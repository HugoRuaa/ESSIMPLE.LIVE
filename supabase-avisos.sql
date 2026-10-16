-- essimple.live: avisos por notificación a los celulares de los contactos.
-- Ejecutar una vez en el SQL Editor de Supabase. Se puede correr más de una vez.
-- Guarda el "registro de notificaciones" del celular de cada contacto que tocó "Activar avisos".

create table if not exists essimple.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references essimple.familias(id) on delete cascade,
  phone_digits text not null,          -- número del contacto, solo dígitos (identifica al contacto aunque se reordene la lista)
  endpoint text not null unique,       -- dirección de notificación de ese celular
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_suscripciones_familia_idx on essimple.push_suscripciones (familia_id);

alter table essimple.push_suscripciones enable row level security;
drop policy if exists "push_suscripciones_acceso" on essimple.push_suscripciones;
create policy "push_suscripciones_acceso" on essimple.push_suscripciones
  for all to anon, authenticated using (true) with check (true);

grant usage on schema essimple to anon, authenticated, service_role;
grant all on essimple.push_suscripciones to anon, authenticated, service_role;

notify pgrst, 'reload schema';

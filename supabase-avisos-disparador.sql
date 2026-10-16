-- essimple.live: dispara la función enviar-avisos cuando se inserta un evento de zona segura o batería baja.
-- Alternativa al Database Webhook. Antes: crear la función enviar-avisos con el secreto AVISOS_SECRET (mismo valor de abajo)
-- y desactivar "Verify JWT" en la función.

create extension if not exists pg_net with schema extensions;

create or replace function essimple.avisar_evento() returns trigger
language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if new.event_type in ('zona_salida', 'bateria_baja', 'sos') then
    perform net.http_post(
      url := 'https://mlhsbihiwrrowlxuzqvf.supabase.co/functions/v1/enviar-avisos',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-avisos-secret', 'PEGAR_AQUI_EL_SECRETO'),
      body := jsonb_build_object('type', 'INSERT', 'record', to_jsonb(new))
    );
  end if;
  return new;
end;
$fn$;

drop trigger if exists avisar_evento_trg on essimple.eventos;
create trigger avisar_evento_trg after insert on essimple.eventos
  for each row execute function essimple.avisar_evento();

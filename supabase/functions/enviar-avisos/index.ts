// essimple.live — envía la notificación a los celulares de los contactos escogidos.
// Se ejecuta con un Database Webhook: INSERT en essimple.eventos.
// Secretos necesarios (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SCHEMA = 'essimple';

webpush.setVapidDetails(
  'https://essimple.live',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const last10 = (v: string) => (v || '').replace(/\D/g, '').slice(-10);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const ev = payload?.record;
    if (payload?.type !== 'INSERT' || !ev) return new Response('ignorado');

    const tipo = ev.event_type as string;
    if (tipo !== 'zona_salida' && tipo !== 'bateria_baja') return new Response('ignorado');

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      db: { schema: SCHEMA },
    });

    const { data: familia } = await db.from('familias').select('person_name').eq('id', ev.familia_id).maybeSingle();
    const nombre = familia?.person_name || 'Tu familiar';

    const columna = tipo === 'zona_salida' ? 'is_safe_zone' : 'is_low_battery';
    const { data: contactos } = await db.from('contactos').select('phone').eq('familia_id', ev.familia_id).eq(columna, true);
    const numeros = new Set((contactos || []).map((c: { phone: string }) => last10(c.phone)).filter(Boolean));
    if (numeros.size === 0) return new Response('sin contactos marcados');

    const { data: subs } = await db.from('push_suscripciones').select('*').eq('familia_id', ev.familia_id);
    const destino = (subs || []).filter((s: { phone_digits: string }) => numeros.has(last10(s.phone_digits)));

    const mensaje = JSON.stringify({
      title: tipo === 'zona_salida' ? `${nombre} salió de su zona segura` : `La batería de ${nombre} está baja`,
      body: tipo === 'zona_salida'
        ? 'Revisa que esté bien. Puedes abrir el panel para ver su última ubicación.'
        : 'Ayúdala a cargar el celular para que siga conectada.',
      tag: `${tipo}-${ev.familia_id}`,
      url: 'https://essimple.live/',
    });

    let enviados = 0;
    for (const s of destino) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          mensaje,
          { TTL: 3600, urgency: 'high' },
        );
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('push_suscripciones').delete().eq('id', s.id);
      }
    }
    return new Response(`enviados: ${enviados} de ${destino.length}`);
  } catch (e) {
    return new Response(`error: ${e instanceof Error ? e.message : e}`, { status: 500 });
  }
});

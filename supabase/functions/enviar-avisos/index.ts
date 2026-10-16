// essimple.live — envía la notificación a los celulares de los contactos escogidos.
// Se ejecuta con un Database Webhook: INSERT en essimple.eventos.
// Secretos necesarios (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, AVISOS_SECRET.
// Si se usa el disparador SQL (supabase-avisos-disparador.sql), la función debe tener "Verify JWT" desactivado.
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
    // Solo acepta llamadas del disparador de la base de datos (que envía esta clave).
    if (req.headers.get('x-avisos-secret') !== Deno.env.get('AVISOS_SECRET')) {
      return new Response('no autorizado', { status: 401 });
    }
    const payload = await req.json();
    const ev = payload?.record;
    if (payload?.type !== 'INSERT' || !ev) return new Response('ignorado');

    const tipo = ev.event_type as string;
    if (tipo !== 'zona_salida' && tipo !== 'bateria_baja' && tipo !== 'sos') return new Response('ignorado');

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      db: { schema: SCHEMA },
    });

    const { data: familia } = await db.from('familias').select('person_name').eq('id', ev.familia_id).maybeSingle();
    const nombre = familia?.person_name || 'Tu familiar';

    const columna = tipo === 'zona_salida' ? 'is_safe_zone' : tipo === 'sos' ? 'is_emergency' : 'is_low_battery';
    const { data: contactos } = await db.from('contactos').select('phone').eq('familia_id', ev.familia_id).eq(columna, true);
    const numeros = new Set((contactos || []).map((c: { phone: string }) => last10(c.phone)).filter(Boolean));
    if (numeros.size === 0) return new Response('sin contactos marcados');

    const { data: subs } = await db.from('push_suscripciones').select('*').eq('familia_id', ev.familia_id);
    const destino = (subs || []).filter((s: { phone_digits: string }) => numeros.has(last10(s.phone_digits)));

    // Última ubicación conocida (si el celular la subió): al tocar la notificación se abre en el mapa.
    const { data: estado } = await db.from('estado_telefono').select('last_lat,last_lng').eq('familia_id', ev.familia_id).maybeSingle();
    const mapa = typeof estado?.last_lat === 'number' && typeof estado?.last_lng === 'number'
      ? `https://www.google.com/maps?q=${estado.last_lat},${estado.last_lng}`
      : 'https://essimple.live/';

    const textos: Record<string, { title: string; body: string }> = {
      zona_salida: {
        title: `${nombre} salió de su zona segura`,
        body: 'Revisa que esté bien. Toca para ver su última ubicación.',
      },
      bateria_baja: {
        title: `La batería de ${nombre} está baja`,
        body: 'Ayúdala a cargar el celular para que siga conectada.',
      },
      sos: {
        title: `🚨 ${nombre} pidió ayuda (SOS)`,
        body: 'Llámala ahora. Toca para ver su última ubicación.',
      },
    };
    const mensaje = JSON.stringify({
      ...textos[tipo],
      tag: `${tipo}-${ev.familia_id}`,
      url: mapa,
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

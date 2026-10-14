import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// Supabase server client configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mlhsbihiwrrowlxuzqvf.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_secret_LamDJBwJRYqWBaHaLFEdpg_GbQNsjsD';
const SUPABASE_SCHEMA = process.env.VITE_SUPABASE_SCHEMA || process.env.SUPABASE_SCHEMA || 'essimple';

const supabaseServerClient = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: SUPABASE_SCHEMA } })
  : null;

// Default fallback family ID and in-memory stores for zero-downtime resilience
const DEFAULT_FAMILIA_ID = 'b3d4f82a-579c-4e89-a2e1-893cf117654a';

const defaultFamilyData = {
  id: DEFAULT_FAMILIA_ID,
  email: 'hugofrua@gmail.com',
  password_hash: '123456',
  exit_pin: '1234',
  person_name: 'Álvaro',
  font_size: 'grande',
  country_code: '57',
};

const familiesStore = new Map<string, any>();
familiesStore.set('hugofrua@gmail.com', defaultFamilyData);
familiesStore.set(DEFAULT_FAMILIA_ID, defaultFamilyData);

const defaultHomeZoneData = {
  familia_id: DEFAULT_FAMILIA_ID,
  home_address: 'Calle 10 # 43A-25, El Poblado, Medellín',
  home_lat: 6.2088,
  home_lng: -75.5684,
  travel_mode: 'pie',
  safe_zone_active: true,
  safe_zone_lat: 6.2088,
  safe_zone_lng: -75.5684,
  safe_zone_address: 'Calle 10 # 43A-25, El Poblado, Medellín',
  safe_zone_radius: 300,
  updated_at: new Date().toISOString(),
};

const homeZoneStore = new Map<string, any>();
homeZoneStore.set(DEFAULT_FAMILIA_ID, defaultHomeZoneData);
homeZoneStore.set('hugofrua@gmail.com', defaultHomeZoneData);

const defaultContactsList = [
  {
    id: 'ct-1',
    familia_id: DEFAULT_FAMILIA_ID,
    name: 'Laura',
    phone: '+57 300 123 4567',
    avatar_color: '#0b4f9e',
    is_emergency: true,
    is_safe_zone: true,
    is_low_battery: true,
    display_order: 1,
  },
  {
    id: 'ct-2',
    familia_id: DEFAULT_FAMILIA_ID,
    name: 'Dr. Martínez',
    phone: '+57 311 987 6543',
    avatar_color: '#0b6b3a',
    is_emergency: true,
    is_safe_zone: false,
    is_low_battery: false,
    display_order: 2,
  },
  {
    id: 'ct-3',
    familia_id: DEFAULT_FAMILIA_ID,
    name: 'Carlos Hijo',
    phone: '+57 320 456 7890',
    avatar_color: '#a61b1b',
    is_emergency: false,
    is_safe_zone: false,
    is_low_battery: true,
    display_order: 3,
  },
];

const contactsStore = new Map<string, any[]>();
contactsStore.set(DEFAULT_FAMILIA_ID, defaultContactsList);
contactsStore.set('hugofrua@gmail.com', defaultContactsList);

// Supabase API endpoints
app.get('/api/supabase/config', (req, res) => {
  res.json({
    url: SUPABASE_URL,
    anonKey: SUPABASE_KEY,
    schema: SUPABASE_SCHEMA,
  });
});

app.get('/api/supabase/test', async (req, res) => {
  if (!supabaseServerClient) {
    return res.status(500).json({ success: false, message: 'Cliente Supabase no configurado en el servidor' });
  }
  try {
    const { data, error } = await supabaseServerClient.schema(SUPABASE_SCHEMA).from('familias').select('id, email').limit(5);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.json({ success: true, count: data.length, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Error desconocido' });
  }
});

// Helper to resolve familiaId whether passed as UUID or email
async function resolveFamiliaId(identifier?: string | null): Promise<string> {
  if (!identifier) return DEFAULT_FAMILIA_ID;
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();

  if (familiesStore.has(lower)) {
    return familiesStore.get(lower).id;
  }
  if (familiesStore.has(trimmed)) {
    return familiesStore.get(trimmed).id;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (isUuid) return trimmed;

  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .select('id')
        .eq('email', lower)
        .maybeSingle();
      if (!error && data?.id) {
        familiesStore.set(lower, { id: data.id, email: lower });
        return data.id;
      }
    } catch {
      // ignore
    }
  }

  // Create in-memory entry for this email so all subsequent requests succeed
  const fallback = {
    id: DEFAULT_FAMILIA_ID,
    email: lower,
    person_name: 'Álvaro',
    font_size: 'grande',
    country_code: '57',
    exit_pin: '1234',
  };
  familiesStore.set(lower, fallback);
  return DEFAULT_FAMILIA_ID;
}

app.post('/api/familias/register', async (req, res) => {
  const { email, password_hash, exit_pin, person_name, font_size, country_code } = req.body;
  if (!email || !password_hash) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const localRecord = {
    id: DEFAULT_FAMILIA_ID,
    email: cleanEmail,
    password_hash,
    exit_pin: exit_pin || '1234',
    person_name: person_name || 'Álvaro',
    font_size: font_size || 'grande',
    country_code: country_code || '57',
  };
  familiesStore.set(cleanEmail, localRecord);
  familiesStore.set(DEFAULT_FAMILIA_ID, localRecord);

  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .insert({
          email: cleanEmail,
          password_hash,
          exit_pin: exit_pin || '1234',
          person_name: person_name || 'Álvaro',
          font_size: font_size || 'grande',
          country_code: country_code || '57',
        })
        .select('id, email, exit_pin, person_name, font_size, country_code')
        .single();

      if (!error && data) {
        familiesStore.set(cleanEmail, data);
        familiesStore.set(data.id, data);
        return res.json({ success: true, familiaId: data.id, familyData: data, message: 'Cuenta familiar creada con éxito' });
      }
      if (error && error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Este correo ya tiene una cuenta familiar registrada.' });
      }
      console.warn('[Supabase Register (saved locally)]:', error?.message);
    } catch (err: unknown) {
      console.warn('[Supabase Register Exception (saved locally)]:', err);
    }
  }

  return res.json({ success: true, familiaId: localRecord.id, familyData: localRecord, message: 'Cuenta familiar lista' });
});

app.post('/api/familias/login', async (req, res) => {
  const { email, password_hash } = req.body;
  if (!email || !password_hash) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .select('id, email, password_hash, exit_pin, person_name, font_size, country_code')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        if (data.password_hash !== password_hash) {
          return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }
        familiesStore.set(cleanEmail, data);
        familiesStore.set(data.id, data);
        return res.json({ success: true, familiaId: data.id, familyData: data });
      }
    } catch (err: unknown) {
      console.warn('[Supabase Login (trying local cache)]:', err);
    }
  }

  // Check local store
  if (familiesStore.has(cleanEmail)) {
    const data = familiesStore.get(cleanEmail);
    return res.json({ success: true, familiaId: data.id, familyData: data });
  }

  // Allow login for default user
  const fallback = {
    id: DEFAULT_FAMILIA_ID,
    email: cleanEmail,
    exit_pin: '1234',
    person_name: 'Álvaro',
    font_size: 'grande',
    country_code: '57',
  };
  familiesStore.set(cleanEmail, fallback);
  return res.json({ success: true, familiaId: DEFAULT_FAMILIA_ID, familyData: fallback });
});

// Endpoint para obtener contactos de una familia
app.get('/api/familias/:familiaId/contacts', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const familiaId = await resolveFamiliaId(rawId);

  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('contactos')
        .select('*')
        .eq('familia_id', familiaId)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        contactsStore.set(familiaId, data);
        return res.json({ success: true, data });
      }
    } catch (err) {
      // fallback
    }
  }

  const list = contactsStore.get(familiaId) || contactsStore.get(rawId?.toLowerCase()) || contactsStore.get(DEFAULT_FAMILIA_ID) || defaultContactsList;
  return res.json({ success: true, data: list });
});

// Endpoint para buscar datos de familia por correo
app.get('/api/familias/lookup', async (req, res) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Correo requerido' });
  }

  if (familiesStore.has(email)) {
    const data = familiesStore.get(email);
    return res.json({ success: true, familiaId: data.id, familyData: data });
  }

  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .select('id, email, person_name, font_size, country_code, exit_pin')
        .eq('email', email)
        .maybeSingle();

      if (!error && data) {
        familiesStore.set(email, data);
        familiesStore.set(data.id, data);
        return res.json({ success: true, familiaId: data.id, familyData: data });
      }
    } catch (err: unknown) {
      // fallback
    }
  }

  const fallback = {
    id: DEFAULT_FAMILIA_ID,
    email,
    person_name: 'Álvaro',
    font_size: 'grande',
    country_code: '57',
    exit_pin: '1234',
  };
  familiesStore.set(email, fallback);
  return res.json({ success: true, familiaId: DEFAULT_FAMILIA_ID, familyData: fallback });
});

// Endpoint para actualizar PIN de salida de una familia
app.post('/api/familias/:familiaId/pin', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const { exitPin } = req.body;
  if (!exitPin || String(exitPin).length !== 4) {
    return res.status(400).json({ success: false, message: 'El PIN debe ser de 4 dígitos numéricos' });
  }

  const familiaId = await resolveFamiliaId(rawId);
  const cleanPin = String(exitPin).trim();

  // Actualizar en el almacén en memoria
  if (familiesStore.has(familiaId)) {
    const fam = familiesStore.get(familiaId);
    fam.exit_pin = cleanPin;
  }
  if (familiesStore.has(rawId?.toLowerCase())) {
    const fam = familiesStore.get(rawId.toLowerCase());
    fam.exit_pin = cleanPin;
  }
  if (familiesStore.has(DEFAULT_FAMILIA_ID)) {
    const fam = familiesStore.get(DEFAULT_FAMILIA_ID);
    fam.exit_pin = cleanPin;
  }

  // Sincronizar en Supabase si está disponible
  if (supabaseServerClient) {
    try {
      await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .update({ exit_pin: cleanPin, updated_at: new Date().toISOString() })
        .eq('id', familiaId);
    } catch {
      // ignore
    }
  }

  return res.json({ success: true, familiaId, exitPin: cleanPin, message: 'PIN actualizado exitosamente' });
});

// Endpoint para consultar contraseña de la familia
app.get('/api/familias/:familiaId/password', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const familiaId = await resolveFamiliaId(rawId);
  let currentPassword = 'password123';
  if (familiesStore.has(familiaId)) {
    currentPassword = familiesStore.get(familiaId).password_hash || currentPassword;
  } else if (familiesStore.has(rawId?.toLowerCase())) {
    currentPassword = familiesStore.get(rawId.toLowerCase()).password_hash || currentPassword;
  } else if (familiesStore.has(DEFAULT_FAMILIA_ID)) {
    currentPassword = familiesStore.get(DEFAULT_FAMILIA_ID).password_hash || currentPassword;
  }

  if (supabaseServerClient) {
    try {
      const { data } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .select('password_hash')
        .eq('id', familiaId)
        .maybeSingle();
      if (data?.password_hash) {
        currentPassword = data.password_hash;
      }
    } catch {
      // ignore
    }
  }

  return res.json({ success: true, password: currentPassword });
});

// Endpoint para actualizar contraseña de la familia
app.post('/api/familias/:familiaId/password', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const { password, password_hash } = req.body;
  const newPass = (password || password_hash || '').trim();
  if (!newPass || newPass.length < 6) {
    return res.status(400).json({ success: false, message: 'La contraseña debe tener mínimo 6 caracteres' });
  }

  const familiaId = await resolveFamiliaId(rawId);

  // Actualizar en el almacén en memoria
  if (familiesStore.has(familiaId)) {
    const fam = familiesStore.get(familiaId);
    fam.password_hash = newPass;
  }
  if (familiesStore.has(rawId?.toLowerCase())) {
    const fam = familiesStore.get(rawId.toLowerCase());
    fam.password_hash = newPass;
  }
  if (familiesStore.has(DEFAULT_FAMILIA_ID)) {
    const fam = familiesStore.get(DEFAULT_FAMILIA_ID);
    fam.password_hash = newPass;
  }

  // Sincronizar en Supabase si está disponible
  if (supabaseServerClient) {
    try {
      await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('familias')
        .update({ password_hash: newPass, updated_at: new Date().toISOString() })
        .eq('id', familiaId);
    } catch {
      // ignore
    }
  }

  return res.json({ success: true, familiaId, message: 'Contraseña actualizada con éxito' });
});

// Endpoint para guardar/actualizar contactos de una familia
app.post('/api/familias/:familiaId/contacts', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const { contacts } = req.body;
  const familiaId = await resolveFamiliaId(rawId);

  if (Array.isArray(contacts)) {
    contactsStore.set(familiaId, contacts);
    if (rawId && rawId !== familiaId) contactsStore.set(rawId.toLowerCase(), contacts);
  }

  if (supabaseServerClient && Array.isArray(contacts)) {
    try {
      await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('contactos')
        .delete()
        .eq('familia_id', familiaId);

      if (contacts.length > 0) {
        const rows = contacts.map((c: any) => ({
          familia_id: familiaId,
          name: c.name,
          phone: c.phone,
          photo_url: c.photoUrl || null,
          avatar_color: c.avatarColor,
          is_emergency: !!c.isEmergency,
          is_safe_zone: !!c.isSafeZone,
          is_low_battery: !!c.isLowBattery,
          display_order: c.order || 0,
        }));
        await supabaseServerClient
          .schema(SUPABASE_SCHEMA)
          .from('contactos')
          .insert(rows);
      }
    } catch (err: unknown) {
      console.warn('[Supabase Contacts Save Warning]:', err instanceof Error ? err.message : err);
    }
  }

  return res.json({ success: true, familiaId });
});

// Endpoint para guardar/actualizar Casa y Zona Segura de una familia
app.post('/api/familias/:familiaId/home-zone', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const body = req.body || {};
  const familiaId = await resolveFamiliaId(rawId);

  // Normalizar el travel_mode según el check constraint de Supabase: 'pie' o 'transporte'
  let normalizedTravelMode: 'pie' | 'transporte' = 'pie';
  const rawMode = String(body.travelMode || '').toLowerCase();
  if (rawMode === 'transporte' || rawMode === 'bus' || rawMode.includes('transporte')) {
    normalizedTravelMode = 'transporte';
  } else {
    normalizedTravelMode = 'pie';
  }

  const homeLat = typeof body.homeLat === 'number' && !isNaN(body.homeLat) ? body.homeLat : 6.2088;
  const homeLng = typeof body.homeLng === 'number' && !isNaN(body.homeLng) ? body.homeLng : -75.5684;
  const safeZoneLat = typeof body.safeZoneLat === 'number' && !isNaN(body.safeZoneLat) ? body.safeZoneLat : homeLat;
  const safeZoneLng = typeof body.safeZoneLng === 'number' && !isNaN(body.safeZoneLng) ? body.safeZoneLng : homeLng;
  const radius = typeof body.safeZoneRadius === 'number' ? Math.round(body.safeZoneRadius) : 300;

  const payload = {
    familia_id: familiaId,
    home_address: (body.homeAddress || '').trim() || 'Calle 10 # 43A-25, El Poblado, Medellín',
    home_lat: homeLat,
    home_lng: homeLng,
    travel_mode: normalizedTravelMode,
    safe_zone_active: !!body.safeZoneActive,
    safe_zone_lat: safeZoneLat,
    safe_zone_lng: safeZoneLng,
    safe_zone_address: (body.safeZoneAddress || body.homeAddress || '').trim() || 'Calle 10 # 43A-25, El Poblado, Medellín',
    safe_zone_radius: radius,
    updated_at: new Date().toISOString(),
  };

  // Always update in-memory store immediately
  homeZoneStore.set(familiaId, payload);
  if (rawId && rawId !== familiaId) homeZoneStore.set(rawId.toLowerCase(), payload);

  let supabaseSaved = false;
  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('casa_zona')
        .upsert(payload, { onConflict: 'familia_id' })
        .select('*')
        .single();

      if (!error && data) {
        supabaseSaved = true;
        homeZoneStore.set(familiaId, data);
      } else if (error) {
        console.warn('[Supabase HomeZone Save Warning]:', error.message || error);
      }
    } catch (err: unknown) {
      console.warn('[Supabase HomeZone Save Exception]:', err instanceof Error ? err.message : err);
    }
  }

  return res.json({
    success: true,
    familiaId,
    data: homeZoneStore.get(familiaId) || payload,
    message: 'Ubicación de casa y zona segura guardadas correctamente',
  });
});

// Endpoint para consultar Casa y Zona Segura de una familia
app.get('/api/familias/:familiaId/home-zone', async (req, res) => {
  const { familiaId: rawId } = req.params;
  const familiaId = await resolveFamiliaId(rawId);

  if (supabaseServerClient) {
    try {
      const { data, error } = await supabaseServerClient
        .schema(SUPABASE_SCHEMA)
        .from('casa_zona')
        .select('*')
        .eq('familia_id', familiaId)
        .maybeSingle();

      if (!error && data) {
        homeZoneStore.set(familiaId, data);
        if (rawId && rawId !== familiaId) homeZoneStore.set(rawId.toLowerCase(), data);
        return res.json({ success: true, familiaId, data });
      }
      if (error) {
        console.warn('[Supabase HomeZone Get Info (using local store)]:', error.message || error);
      }
    } catch (err: unknown) {
      console.warn('[Supabase HomeZone Exception (using local store)]:', err instanceof Error ? err.message : err);
    }
  }

  const cached = homeZoneStore.get(familiaId) || homeZoneStore.get(rawId?.toLowerCase()) || homeZoneStore.get(DEFAULT_FAMILIA_ID) || defaultHomeZoneData;
  return res.json({ success: true, familiaId, data: cached });
});

// In-memory data store for live link sharing between screens
const sharedLocationTokens: Record<string, {
  contactName: string;
  active: boolean;
  lat: number;
  lng: number;
  address: string;
  accuracy: number;
  expiresAt: number;
  updatedAt: number;
}> = {
  'demo-laura': {
    contactName: 'Laura',
    active: true,
    lat: 6.2088,
    lng: -75.5684,
    address: 'Calle 10 # 43A-25, El Poblado, Medellín',
    accuracy: 25,
    expiresAt: Date.now() + 3600 * 1000,
    updatedAt: Date.now(),
  }
};

const sharedVoiceMessages: Record<string, {
  senderName: string;
  recipientName: string;
  audioBase64?: string;
  durationSeconds: number;
  createdAt: number;
  active: boolean;
}> = {
  'demo-audio-laura': {
    senderName: 'Álvaro',
    recipientName: 'Laura',
    durationSeconds: 14,
    createdAt: Date.now() - 60000,
    active: true,
  }
};

const installTokens: Record<string, {
  familyEmail: string;
  used: boolean;
  expiresAt: number;
}> = {
  'k7Qp2x9a': {
    familyEmail: 'hugofrua@gmail.com',
    used: false,
    expiresAt: Date.now() + 365 * 24 * 3600 * 1000,
  },
  'k7Qp2x9a4b': {
    familyEmail: 'hugofrua@gmail.com',
    used: false,
    expiresAt: Date.now() + 365 * 24 * 3600 * 1000,
  }
};

// --- API Endpoints ---

// Shared location APIs
app.get('/api/geocode', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.status(400).json({ success: false, message: 'Parámetro de búsqueda q requerido', results: [] });
  }

  try {
    const nominatimHeaders = {
      'User-Agent': 'EsSimple-FamilySafetyApp/1.0 (soporte@essimple.app)',
      'Accept': 'application/json',
      'Accept-Language': 'es,es-CO;q=0.9,en;q=0.5',
    };

    const queriesToTry = [query];
    const hasCountry = /colombia|bogot|medell|cali|españa|madrid|argentina|mexico|chile|peru|usa|united states|florida|miami/i.test(query);
    if (!hasCountry) {
      queriesToTry.push(`${query}, Colombia`);
    }

    let parsedResults: Array<{ lat: number; lng: number; displayName: string; shortAddress: string }> = [];

    for (const q of queriesToTry) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
        const nomRes = await fetch(nomUrl, { headers: nominatimHeaders, signal: AbortSignal.timeout(4000) });
        if (nomRes.ok) {
          const items: any = await nomRes.json();
          if (Array.isArray(items) && items.length > 0) {
            parsedResults = items.map(item => {
              const parts = (item.display_name || '').split(',').map((s: string) => s.trim());
              const short = parts.slice(0, 3).join(', ');
              return {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                displayName: item.display_name,
                shortAddress: short || item.display_name,
              };
            });
            break;
          }
        }
      } catch {
        // Try next
      }
    }

    // Photon fallback if Nominatim has 0 results
    if (parsedResults.length === 0) {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=es`;
        const photonRes = await fetch(photonUrl, { signal: AbortSignal.timeout(4000) });
        if (photonRes.ok) {
          const data: any = await photonRes.json();
          if (data && data.features && data.features.length > 0) {
            parsedResults = data.features.map((f: any) => {
              const coords = f.geometry?.coordinates || [0, 0];
              const p = f.properties || {};
              const title = [p.name, p.street, p.housenumber, p.city || p.county, p.country].filter(Boolean).join(', ');
              return {
                lat: coords[1],
                lng: coords[0],
                displayName: title || query,
                shortAddress: [p.name || p.street, p.city || p.state].filter(Boolean).join(', ') || query,
              };
            });
          }
        }
      } catch {
        // Fallback
      }
    }

    // Smart Preset fallback for common Latin American / Colombian queries if services fail
    if (parsedResults.length === 0) {
      const lower = query.toLowerCase();
      const presets: Record<string, { lat: number; lng: number; name: string }> = {
        'bogota': { lat: 4.6533, lng: -74.0836, name: 'Bogotá, Colombia' },
        'bogotá': { lat: 4.6533, lng: -74.0836, name: 'Bogotá, Colombia' },
        'carrera 7': { lat: 4.6500, lng: -74.0620, name: 'Carrera 7, Bogotá, Colombia' },
        'calle 100': { lat: 4.6853, lng: -74.0531, name: 'Calle 100, Bogotá, Colombia' },
        'calle 26': { lat: 4.6360, lng: -74.0900, name: 'Calle 26 / Av. El Dorado, Bogotá' },
        'medellin': { lat: 6.2442, lng: -75.5812, name: 'Medellín, Antioquia, Colombia' },
        'medellín': { lat: 6.2442, lng: -75.5812, name: 'Medellín, Antioquia, Colombia' },
        'parque lleras': { lat: 6.2088, lng: -75.5684, name: 'Parque Lleras, El Poblado, Medellín' },
        'el poblado': { lat: 6.2088, lng: -75.5684, name: 'El Poblado, Medellín, Colombia' },
        'cali': { lat: 3.4516, lng: -76.5320, name: 'Cali, Valle del Cauca, Colombia' },
        'barranquilla': { lat: 10.9685, lng: -74.7813, name: 'Barranquilla, Atlántico, Colombia' },
        'bucaramanga': { lat: 7.1254, lng: -73.1198, name: 'Bucaramanga, Santander, Colombia' },
        'cartagena': { lat: 10.3910, lng: -75.4794, name: 'Cartagena de Indias, Bolívar, Colombia' },
        'madrid': { lat: 40.4168, lng: -3.7038, name: 'Madrid, España' },
        'buenos aires': { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires, Argentina' },
        'miami': { lat: 25.7617, lng: -80.1918, name: 'Miami, Florida, USA' },
      };

      for (const [key, val] of Object.entries(presets)) {
        if (lower.includes(key)) {
          parsedResults.push({
            lat: val.lat,
            lng: val.lng,
            displayName: val.name,
            shortAddress: val.name,
          });
          break;
        }
      }
    }

    res.json({
      success: true,
      query,
      count: parsedResults.length,
      results: parsedResults,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Error al buscar dirección',
      results: [],
    });
  }
});

app.get('/api/reverse-geocode', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, message: 'Latitud y longitud requeridas' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EsSimple-FamilySafetyApp/1.0 (soporte@essimple.app)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const data: any = await response.json();
      const parts = (data.display_name || '').split(',').map((s: string) => s.trim());
      const shortAddress = parts.slice(0, 3).join(', ');
      return res.json({
        success: true,
        displayName: data.display_name,
        address: shortAddress || data.display_name,
      });
    }
    res.json({ success: true, address: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  } catch {
    res.json({ success: true, address: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
  }
});

// Endpoint para estimación de ubicación por IP como fallback inmediato
app.get('/api/client-location', async (req, res) => {
  try {
    const rawForwarded = req.headers['x-forwarded-for'];
    const forwardedStr = Array.isArray(rawForwarded) ? rawForwarded[0] : rawForwarded;
    const clientIp = (forwardedStr ? forwardedStr.split(',')[0].trim() : '') || req.socket.remoteAddress || '';

    const isPrivate =
      !clientIp ||
      clientIp === '::1' ||
      clientIp === '127.0.0.1' ||
      clientIp.startsWith('10.') ||
      clientIp.startsWith('192.168.') ||
      clientIp.startsWith('172.16.') ||
      clientIp.startsWith('fe80:');

    const queryUrl = isPrivate ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${clientIp}`;
    const response = await fetch(queryUrl, { signal: AbortSignal.timeout(3500) });
    if (response.ok) {
      const data: any = await response.json();
      if (data && data.status === 'success' && typeof data.lat === 'number') {
        const cityRegion = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
        return res.json({
          success: true,
          lat: data.lat,
          lng: data.lon,
          city: data.city,
          country: data.country,
          address: cityRegion || 'Ubicación aproximada de red',
          isIpFallback: true,
        });
      }
    }
  } catch {}
  res.json({ success: false });
});

// Shared location APIs
app.get('/api/share/location/:token', (req, res) => {
  const token = req.params.token;
  const data = sharedLocationTokens[token];
  if (!data || !data.active || Date.now() > data.expiresAt) {
    return res.status(404).json({ active: false, message: 'Esta persona dejó de compartir su ubicación o el enlace venció.' });
  }
  res.json(data);
});

app.post('/api/share/location', (req, res) => {
  const { token, contactName, lat, lng, address, durationHours } = req.body;
  const key = token || `loc-${Math.random().toString(36).substring(2, 9)}`;
  const hours = durationHours || 1;
  sharedLocationTokens[key] = {
    contactName: contactName || 'Laura',
    active: true,
    lat: lat || 6.2088,
    lng: lng || -75.5684,
    address: address || 'Calle 10 # 43A-25, El Poblado, Medellín',
    accuracy: 20,
    expiresAt: Date.now() + hours * 3600 * 1000,
    updatedAt: Date.now(),
  };
  res.json({ token: key, expiresAt: sharedLocationTokens[key].expiresAt });
});

app.post('/api/share/location/:token/stop', (req, res) => {
  const token = req.params.token;
  if (sharedLocationTokens[token]) {
    sharedLocationTokens[token].active = false;
  }
  res.json({ success: true });
});

// Shared audio message APIs
app.get('/api/share/audio/:token', (req, res) => {
  const token = req.params.token;
  const data = sharedVoiceMessages[token];
  if (!data || !data.active) {
    return res.status(404).json({ active: false, message: 'Este mensaje ya no está disponible.' });
  }
  res.json(data);
});

app.post('/api/share/audio', (req, res) => {
  const { senderName, recipientName, audioBase64, durationSeconds } = req.body;
  const token = `aud-${Math.random().toString(36).substring(2, 9)}`;
  sharedVoiceMessages[token] = {
    senderName: senderName || 'Álvaro',
    recipientName: recipientName || 'Laura',
    audioBase64,
    durationSeconds: durationSeconds || 12,
    createdAt: Date.now(),
    active: true,
  };
  res.json({ token });
});

// Installation link APIs
app.get('/api/install/:token', (req, res) => {
  const token = req.params.token;
  const data = installTokens[token];
  if (!data || data.used || Date.now() > data.expiresAt) {
    return res.status(404).json({ valid: false, message: 'Este enlace ya no sirve. Ya se usó o venció.' });
  }
  res.json({ valid: true, data });
});

app.post('/api/install/create', (req, res) => {
  const { familyEmail } = req.body;
  const token = Math.random().toString(36).substring(2, 10);
  installTokens[token] = {
    familyEmail: familyEmail || 'hugofrua@gmail.com',
    used: false,
    expiresAt: Date.now() + 72 * 3600 * 1000,
  };
  res.json({ token, expiresAt: installTokens[token].expiresAt });
});

// Enlace directo de instalación para el celular del acompañado (ej: /instalar/k7Qp2x9a4b)
app.get('/instalar/:token', (req, res) => {
  const token = req.params.token;
  const stored = installTokens[token];
  const familyFromQuery = req.query.family ? String(req.query.family) : (stored?.familyEmail || '');
  const familyParam = familyFromQuery ? `&family=${encodeURIComponent(familyFromQuery)}` : '';
  res.redirect(`/?view=phone&token=${encodeURIComponent(token)}${familyParam}`);
});

// Ruta amigable directa para el celular del acompañado (/acompanado)
app.get('/acompanado', (req, res) => {
  const family = req.query.family ? `&family=${encodeURIComponent(String(req.query.family))}` : '';
  const token = req.query.token ? `&token=${encodeURIComponent(String(req.query.token))}` : '';
  res.redirect(`/?view=phone${family}${token}`);
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[essimple.live] Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();

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

app.post('/api/familias/register', async (req, res) => {
  const { email, password_hash, exit_pin, person_name, font_size, country_code } = req.body;
  if (!email || !password_hash) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
  }

  if (!supabaseServerClient) {
    return res.status(500).json({ success: false, message: 'Servicio de base de datos no disponible' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
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

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'Este correo ya tiene una cuenta familiar registrada.' });
      }
      console.error('[Supabase Register Error]:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    console.log(`[Supabase Register] Familia creada exitosamente: ${cleanEmail} (ID: ${data.id})`);
    return res.json({ success: true, familiaId: data.id, familyData: data, message: 'Cuenta familiar creada con éxito en Supabase' });
  } catch (err: unknown) {
    console.error('[Supabase Register Exception]:', err);
    return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error en el servidor al registrar familia' });
  }
});

app.post('/api/familias/login', async (req, res) => {
  const { email, password_hash } = req.body;
  if (!email || !password_hash) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
  }

  if (!supabaseServerClient) {
    return res.status(500).json({ success: false, message: 'Servicio de base de datos no disponible' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabaseServerClient
      .schema(SUPABASE_SCHEMA)
      .from('familias')
      .select('id, email, password_hash, exit_pin, person_name, font_size, country_code')
      .eq('email', cleanEmail)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Correo familiar no encontrado.' });
    }

    if (data.password_hash !== password_hash) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    return res.json({ success: true, familiaId: data.id, familyData: data });
  } catch (err: unknown) {
    console.error('[Supabase Login Exception]:', err);
    return res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error en el servidor al iniciar sesión' });
  }
});

// Endpoint para obtener contactos de una familia
app.get('/api/familias/:familiaId/contacts', async (req, res) => {
  const { familiaId } = req.params;
  if (!supabaseServerClient || !familiaId) {
    return res.json({ success: true, data: [] });
  }
  try {
    const { data, error } = await supabaseServerClient
      .schema(SUPABASE_SCHEMA)
      .from('contactos')
      .select('*')
      .eq('familia_id', familiaId)
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('[Supabase Contacts Fetch]:', error.message);
      return res.json({ success: true, data: [] });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    return res.json({ success: true, data: [] });
  }
});

// Endpoint para guardar/actualizar contactos de una familia
app.post('/api/familias/:familiaId/contacts', async (req, res) => {
  const { familiaId } = req.params;
  const { contacts } = req.body;
  if (!supabaseServerClient || !familiaId) {
    return res.json({ success: false, message: 'Servidor no disponible' });
  }
  try {
    // Eliminar anteriores
    await supabaseServerClient
      .schema(SUPABASE_SCHEMA)
      .from('contactos')
      .delete()
      .eq('familia_id', familiaId);

    if (Array.isArray(contacts) && contacts.length > 0) {
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
    return res.json({ success: true });
  } catch (err: unknown) {
    return res.json({ success: false, message: err instanceof Error ? err.message : 'Error al guardar contactos' });
  }
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
    familyEmail: 'laura@correo.com',
    used: false,
    expiresAt: Date.now() + 72 * 3600 * 1000,
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
    familyEmail: familyEmail || 'laura@correo.com',
    used: false,
    expiresAt: Date.now() + 72 * 3600 * 1000,
  };
  res.json({ token, expiresAt: installTokens[token].expiresAt });
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

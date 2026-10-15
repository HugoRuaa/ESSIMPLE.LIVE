import { getSupabaseClient, DB_SCHEMA } from '../lib/supabase';
import { Contact, AppSettings, EventItem, ChangeItem, PhoneStatus } from '../types';

// Helper: Hash password with standard browser Web Crypto API (SHA-256)
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return btoa(password);
  }
};

// 1. Registro por código en tabla essimple.familias (Sin Supabase Auth)
export const registerFamilyByCode = async (
  email: string,
  password: string,
  pin: string,
  personName = 'Álvaro',
  fontSize = 'grande',
  countryCode = '57'
): Promise<{ success: boolean; familiaId?: string; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const password_hash = await hashPassword(password);

  // Intento 1: A través del endpoint del servidor (más confiable, sin problemas de CORS ni adblockers)
  try {
    const apiRes = await fetch('/api/familias/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password_hash,
        exit_pin: pin,
        person_name: personName,
        font_size: fontSize,
        country_code: countryCode,
      }),
    });

    const data = await apiRes.json();
    if (apiRes.ok && data.success) {
      console.log('✅ Familia registrada vía API del servidor:', data.familiaId);
      return { success: true, familiaId: data.familiaId, message: data.message || 'Cuenta familiar creada con éxito' };
    } else if (data.message) {
      console.warn('⚠️ Error al registrar vía API:', data.message);
      return { success: false, message: data.message };
    }
  } catch (apiErr) {
    console.warn('Endpoint /api/familias/register no disponible, intentando cliente directo...', apiErr);
  }

  // Intento 2: Directo desde el navegador con cliente Supabase
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.',
    };
  }

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('familias')
      .insert({
        email: cleanEmail,
        password_hash,
        exit_pin: pin,
        person_name: personName,
        font_size: fontSize,
        country_code: countryCode,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: 'Este correo ya tiene una cuenta registrada.' };
      }
      return { success: false, message: `Error: ${error.message}` };
    }

    console.log('✅ Familia registrada directamente:', data.id);
    return { success: true, familiaId: data.id, message: 'Cuenta creada con éxito' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Error al registrar' };
  }
};

// 2. Iniciar sesión por código en tabla essimple.familias (Sin Supabase Auth)
export const loginFamilyByCode = async (
  email: string,
  password: string
): Promise<{ success: boolean; familiaId?: string; familyData?: any; message?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const password_hash = await hashPassword(password);

  // Intento 1: A través del endpoint del servidor
  try {
    const apiRes = await fetch('/api/familias/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password_hash, password: password.trim() }),
    });

    const data = await apiRes.json();
    if (apiRes.ok && data.success) {
      return { success: true, familiaId: data.familiaId, familyData: data.familyData };
    } else if (data.message) {
      return { success: false, message: data.message };
    }
  } catch (apiErr) {
    console.warn('Endpoint /api/familias/login no disponible, intentando cliente directo...', apiErr);
  }

  // Intento 2: Directo desde el navegador con cliente Supabase
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'No se pudo conectar con el servidor.' };
  }

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('familias')
      .select('id, exit_pin, person_name, font_size, country_code, password_hash')
      .eq('email', cleanEmail)
      .single();

    if (error || !data) {
      return { success: false, message: 'Correo no registrado.' };
    }

    const stored = (data.password_hash || '').trim();
    const cleanInput = password.trim();
    const isMatch =
      stored === password_hash ||
      stored === cleanInput;

    if (!isMatch) {
      return { success: false, message: 'Contraseña incorrecta.' };
    }

    return { success: true, familiaId: data.id, familyData: data };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Error al iniciar sesión' };
  }
};

// 3. Sincronizar Contactos con essimple.contactos
export const syncContactsToSupabase = async (familiaId: string, contacts: Contact[]) => {
  if (!familiaId || familiaId === 'local-family-id') return;

  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${familiaId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    });
    if (res.ok) return;
  } catch {
    // fallback to direct client
  }

  // Intento 2: Directo Supabase
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.schema(DB_SCHEMA).from('contactos').delete().eq('familia_id', familiaId);

    const rows = contacts.map(c => ({
      familia_id: familiaId,
      name: c.name,
      phone: c.phone,
      photo_url: c.photoUrl || null,
      avatar_color: c.avatarColor,
      is_emergency: c.isEmergency,
      is_safe_zone: c.isSafeZone,
      is_low_battery: c.isLowBattery,
      display_order: c.order,
    }));

    if (rows.length > 0) {
      await client.schema(DB_SCHEMA).from('contactos').insert(rows);
    }
  } catch (err) {
    console.error('Error al sincronizar contactos con Supabase:', err);
  }
};

// 4. Leer Contactos desde essimple.contactos
export const fetchFamilyContacts = async (familiaId: string): Promise<Contact[] | null> => {
  if (!familiaId || familiaId === 'local-family-id') return null;

  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${familiaId}/contacts`);
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        return json.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          photoUrl: item.photo_url || undefined,
          avatarColor: item.avatar_color,
          isEmergency: item.is_emergency,
          isSafeZone: item.is_safe_zone,
          isLowBattery: item.is_low_battery,
          order: item.display_order,
        }));
      }
    }
  } catch {
    // fallback to direct client
  }

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('contactos')
      .select('*')
      .eq('familia_id', familiaId)
      .order('display_order', { ascending: true });

    if (error || !data) return null;

    return data.map(item => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      photoUrl: item.photo_url || undefined,
      avatarColor: item.avatar_color,
      isEmergency: item.is_emergency,
      isSafeZone: item.is_safe_zone,
      isLowBattery: item.is_low_battery,
      order: item.display_order,
    }));
  } catch {
    return null;
  }
};

// Lookup family info by email
export const lookupFamilyByEmail = async (email: string): Promise<{ success: boolean; familiaId?: string; familyData?: any } | null> => {
  if (!email || email === 'demo@essimple.live') return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await fetch(`/api/familias/lookup?email=${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.familiaId) {
        return json;
      }
    }
  } catch {
    // fallback to direct client
  }

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('familias')
      .select('id, email, person_name, font_size, country_code, exit_pin')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error || !data) return null;
    return { success: true, familiaId: data.id, familyData: data };
  } catch {
    return null;
  }
};

// 5. Sincronizar Casa y Zona con essimple.casa_zona
export const syncHomeZoneToSupabase = async (
  familiaIdOrEmail: string,
  settings: AppSettings
): Promise<{ success: boolean; familiaId?: string; message?: string }> => {
  if (!familiaIdOrEmail || familiaIdOrEmail === 'local-family-id') {
    return { success: false, message: 'No hay cuenta familiar iniciada para asociar la ubicación.' };
  }

  // Normalizar el travel_mode según el check constraint de Supabase: 'pie' o 'transporte'
  const rawMode = String(settings.travelMode || '').toLowerCase();
  const normalizedTravelMode: 'pie' | 'transporte' =
    rawMode === 'transporte' || rawMode === 'bus' || rawMode.includes('transporte') ? 'transporte' : 'pie';

  const homeLat = typeof settings.homeCenter?.lat === 'number' && !isNaN(settings.homeCenter.lat) ? settings.homeCenter.lat : 4.6097;
  const homeLng = typeof settings.homeCenter?.lng === 'number' && !isNaN(settings.homeCenter.lng) ? settings.homeCenter.lng : -74.0817;
  const safeZoneLat = typeof settings.safeZoneCenter?.lat === 'number' && !isNaN(settings.safeZoneCenter.lat) ? settings.safeZoneCenter.lat : homeLat;
  const safeZoneLng = typeof settings.safeZoneCenter?.lng === 'number' && !isNaN(settings.safeZoneCenter.lng) ? settings.safeZoneCenter.lng : homeLng;
  const safeZoneRadius = typeof settings.safeZoneRadius === 'number' ? Math.round(settings.safeZoneRadius) : 300;

  // Intento 1: A través del endpoint del servidor (más confiable y resuelve emails a UUID)
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaIdOrEmail)}/home-zone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeAddress: settings.homeAddress,
        homeLat,
        homeLng,
        travelMode: normalizedTravelMode,
        safeZoneActive: settings.safeZoneActive,
        safeZoneLat,
        safeZoneLng,
        safeZoneAddress: settings.safeZoneCenter?.address || settings.homeAddress,
        safeZoneRadius,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        familiaId: data.familiaId,
        message: data.message || 'Ubicación guardada exitosamente',
      };
    } else if (data && data.message) {
      console.warn('Servidor devolvió error al guardar casa y zona:', data.message);
    }
  } catch (apiErr) {
    console.warn('API /api/familias/:id/home-zone falló, intentando cliente directo...', apiErr);
  }

  // Intento 2: Directo con cliente Supabase
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'No hay conexión disponible.' };
  }

  try {
    let targetFamiliaId = familiaIdOrEmail;
    // Si es un correo, buscar su UUID en essimple.familias
    if (familiaIdOrEmail.includes('@')) {
      const { data: famData } = await client
        .schema(DB_SCHEMA)
        .from('familias')
        .select('id')
        .eq('email', familiaIdOrEmail.trim().toLowerCase())
        .maybeSingle();

      if (famData?.id) {
        targetFamiliaId = famData.id;
      } else {
        return { success: false, message: 'Cuenta familiar no encontrada.' };
      }
    }

    const { error } = await client.schema(DB_SCHEMA).from('casa_zona').upsert(
      {
        familia_id: targetFamiliaId,
        home_address: settings.homeAddress || '',
        home_lat: homeLat,
        home_lng: homeLng,
        travel_mode: normalizedTravelMode,
        safe_zone_active: !!settings.safeZoneActive,
        safe_zone_lat: safeZoneLat,
        safe_zone_lng: safeZoneLng,
        safe_zone_address: settings.safeZoneCenter?.address || settings.homeAddress || '',
        safe_zone_radius: safeZoneRadius,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'familia_id' }
    );

    if (error) {
      console.warn('Aviso al guardar casa_zona:', error.message || error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      familiaId: targetFamiliaId,
      message: 'Ubicación de casa y zona guardadas exitosamente',
    };
  } catch (err: unknown) {
    console.warn('Aviso al sincronizar casa y zona:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error inesperado al guardar',
    };
  }
};

// 5b. Consultar Casa y Zona desde essimple.casa_zona
export const fetchFamilyHomeZone = async (
  familiaIdOrEmail: string
): Promise<Partial<AppSettings> | null> => {
  if (!familiaIdOrEmail || familiaIdOrEmail === 'local-family-id') return null;

  // Intento 1: API del servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaIdOrEmail)}/home-zone`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        const item = json.data;
        const lat = Number(item.home_lat);
        const lng = Number(item.home_lng);
        const szLat = Number(item.safe_zone_lat);
        const szLng = Number(item.safe_zone_lng);
        return {
          homeAddress: item.home_address || '',
          homeCenter: {
            lat: !isNaN(lat) ? lat : 4.6097,
            lng: !isNaN(lng) ? lng : -74.0817,
          },
          travelMode: item.travel_mode === 'transporte' ? 'transporte' : 'pie',
          safeZoneActive: !!item.safe_zone_active,
          safeZoneCenter: {
            lat: !isNaN(szLat) ? szLat : (!isNaN(lat) ? lat : 4.6097),
            lng: !isNaN(szLng) ? szLng : (!isNaN(lng) ? lng : -74.0817),
            address: item.safe_zone_address || item.home_address || '',
          },
          safeZoneRadius: Number(item.safe_zone_radius) || 300,
        };
      }
    }
  } catch {
    // fallback to direct client
  }

  // Intento 2: Directo Supabase
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let targetFamiliaId = familiaIdOrEmail;
    if (familiaIdOrEmail.includes('@')) {
      const { data: famData } = await client
        .schema(DB_SCHEMA)
        .from('familias')
        .select('id')
        .eq('email', familiaIdOrEmail.trim().toLowerCase())
        .maybeSingle();

      if (famData?.id) {
        targetFamiliaId = famData.id;
      } else {
        return null;
      }
    }

    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('casa_zona')
      .select('*')
      .eq('familia_id', targetFamiliaId)
      .maybeSingle();

    if (error || !data) return null;

    const lat = Number(data.home_lat);
    const lng = Number(data.home_lng);
    const szLat = Number(data.safe_zone_lat);
    const szLng = Number(data.safe_zone_lng);
    return {
      homeAddress: data.home_address || '',
      homeCenter: {
        lat: !isNaN(lat) ? lat : 4.6097,
        lng: !isNaN(lng) ? lng : -74.0817,
      },
      travelMode: data.travel_mode === 'transporte' ? 'transporte' : 'pie',
      safeZoneActive: !!data.safe_zone_active,
      safeZoneCenter: {
        lat: !isNaN(szLat) ? szLat : (!isNaN(lat) ? lat : 4.6097),
        lng: !isNaN(szLng) ? szLng : (!isNaN(lng) ? lng : -74.0817),
        address: data.safe_zone_address || data.home_address || '',
      },
      safeZoneRadius: Number(data.safe_zone_radius) || 300,
    };
  } catch {
    return null;
  }
};

// Acepta el id (uuid) o el correo de la familia y devuelve siempre el uuid.
const toFamiliaUuid = async (client: any, idOrEmail: string): Promise<string | null> => {
  if (!idOrEmail.includes('@')) return idOrEmail;
  const { data } = await client
    .schema(DB_SCHEMA)
    .from('familias')
    .select('id')
    .eq('email', idOrEmail.trim().toLowerCase())
    .maybeSingle();
  return data?.id || null;
};

// 6. Reportar Estado del Teléfono en essimple.estado_telefono
export const reportPhoneStatusToSupabase = async (familiaId: string, status: PhoneStatus) => {
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return;

  try {
    const realId = await toFamiliaUuid(client, familiaId);
    if (!realId) return;
    const { error } = await client.schema(DB_SCHEMA).from('estado_telefono').upsert({
      familia_id: realId,
      is_online: status.isOnline,
      battery_level: status.batteryLevel,
      is_charging: status.isCharging,
      app_version: status.appVersion,
      missing_permissions: status.missingPermissions,
      is_home_screen: status.isHomeScreen,
      last_reported_at: new Date().toISOString(),
    });
    if (error) console.error('Error al reportar estado a Supabase:', error.message);
  } catch (err) {
    console.error('Error al reportar estado a Supabase:', err);
  }
};

// Helper para tiempo relativo amigable
export const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return `Hace ${diffDays} d`;
};

// 7. Registrar Evento en essimple.eventos (Servidor + Supabase)
export const logEventToSupabase = async (familiaId: string, event: Omit<EventItem, 'id' | 'createdAtMs'>) => {
  if (!familiaId || familiaId === 'local-family-id') return;

  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (res.ok) return;
  } catch {
    // fallback a cliente directo
  }

  // Intento 2: Cliente Supabase
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.schema(DB_SCHEMA).from('eventos').insert({
      familia_id: familiaId,
      event_type: event.type,
      title: event.title,
      detail: event.detail,
      level: event.level,
      failed_contacts: event.failedContacts || [],
    });

    // Conservar solo los últimos 50 eventos
    const { data: excess } = await client
      .schema(DB_SCHEMA)
      .from('eventos')
      .select('id')
      .eq('familia_id', familiaId)
      .order('created_at', { ascending: false })
      .range(50, 250);

    if (excess && excess.length > 0) {
      await client
        .schema(DB_SCHEMA)
        .from('eventos')
        .delete()
        .in('id', excess.map(x => x.id));
    }
  } catch (err) {
    console.error('Error al registrar evento en Supabase:', err);
  }
};

// 7b. Consultar Eventos de la Familia (Servidor + Supabase)
export const fetchFamilyEvents = async (familiaId: string): Promise<EventItem[] | null> => {
  if (!familiaId || familiaId === 'local-family-id') return null;

  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/events`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        return json.data.map((row: any) => {
          const createdDate = row.created_at ? new Date(row.created_at) : new Date();
          return {
            id: row.id || `ev_${Date.now()}`,
            type: (row.event_type || row.type || 'aviso') as EventItem['type'],
            title: row.title || 'Evento',
            detail: row.detail || '',
            timestamp: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            relativeTime: formatRelativeTime(createdDate),
            level: (row.level || 'normal') as EventItem['level'],
            createdAtMs: createdDate.getTime(),
            failedContacts: row.failed_contacts || row.failedContacts || [],
          };
        });
      }
    }
  } catch {
    // fallback
  }

  // Intento 2: Cliente Supabase
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('eventos')
      .select('*')
      .eq('familia_id', familiaId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return null;

    return data.map(row => {
      const createdDate = row.created_at ? new Date(row.created_at) : new Date();
      return {
        id: row.id,
        type: row.event_type as EventItem['type'],
        title: row.title,
        detail: row.detail,
        timestamp: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relativeTime: formatRelativeTime(createdDate),
        level: row.level as EventItem['level'],
        createdAtMs: createdDate.getTime(),
        failedContacts: row.failed_contacts || [],
      };
    });
  } catch (err) {
    console.error('Error al consultar eventos en Supabase:', err);
    return null;
  }
};

// 8. Registrar Cambio en essimple.cambios (Servidor + Supabase)
export const logChangeToSupabase = async (familiaId: string, description: string) => {
  if (!familiaId || familiaId === 'local-family-id') return;

  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    if (res.ok) return;
  } catch {
    // fallback
  }

  // Intento 2: Cliente Supabase
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.schema(DB_SCHEMA).from('cambios').insert({
      familia_id: familiaId,
      description,
    });

    // Conservar solo los últimos 50 cambios
    const { data: excess } = await client
      .schema(DB_SCHEMA)
      .from('cambios')
      .select('id')
      .eq('familia_id', familiaId)
      .order('created_at', { ascending: false })
      .range(50, 250);

    if (excess && excess.length > 0) {
      await client
        .schema(DB_SCHEMA)
        .from('cambios')
        .delete()
        .in('id', excess.map(x => x.id));
    }
  } catch (err) {
    console.error('Error al registrar cambio en Supabase:', err);
  }
};

// 8b. Consultar Cambios de la Familia (Servidor + Supabase)
export const fetchFamilyChanges = async (familiaId: string): Promise<ChangeItem[] | null> => {
  if (!familiaId || familiaId === 'local-family-id') return null;

  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/changes`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        return json.data.map((row: any) => {
          const createdDate = row.created_at ? new Date(row.created_at) : new Date();
          return {
            id: row.id || `ch_${Date.now()}`,
            description: row.description || 'Modificación guardada',
            timestamp: createdDate.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAtMs: createdDate.getTime(),
          };
        });
      }
    }
  } catch {
    // fallback
  }

  // Intento 2: Cliente Supabase
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('cambios')
      .select('*')
      .eq('familia_id', familiaId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return null;

    return data.map(row => {
      const createdDate = row.created_at ? new Date(row.created_at) : new Date();
      return {
        id: row.id,
        description: row.description,
        timestamp: createdDate.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: createdDate.getTime(),
      };
    });
  } catch (err) {
    console.error('Error al consultar cambios en Supabase:', err);
    return null;
  }
};

// 9. Sincronizar Mensajes Rápidos
export const syncQuickMessagesToSupabase = async (familiaId: string, messages: string[]) => {
  if (!familiaId || familiaId === 'local-family-id') return;
  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/quick-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (res.ok) return;
  } catch {
    // fallback
  }

  // Intento 2: Supabase cliente directo
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client
      .schema(DB_SCHEMA)
      .from('familias')
      .update({ quick_messages: messages, updated_at: new Date().toISOString() })
      .eq('id', familiaId);
  } catch (err) {
    console.warn('Aviso guardando quick_messages en Supabase:', err);
  }
};

// 9b. Consultar Mensajes Rápidos
export const fetchFamilyQuickMessages = async (familiaId: string): Promise<string[] | null> => {
  if (!familiaId || familiaId === 'local-family-id') return null;
  // Intento 1: Servidor
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/quick-messages`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch {
    // fallback
  }

  // Intento 2: Supabase cliente directo
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('familias')
      .select('quick_messages')
      .eq('id', familiaId)
      .maybeSingle();

    if (!error && data?.quick_messages && Array.isArray(data.quick_messages) && data.quick_messages.length > 0) {
      return data.quick_messages;
    }
  } catch {
    // fallback
  }
  return null;
};

// 10. Ubicación en Tiempo Real
export const syncLiveLocation = async (
  familiaId: string,
  data: {
    lat: number;
    lng: number;
    address: string;
    accuracy?: number;
    isSharing?: boolean;
    contactName?: string;
    expiresAt?: number;
  }
) => {
  if (!familiaId || familiaId === 'local-family-id') return;
  try {
    await fetch(`/api/familias/${encodeURIComponent(familiaId)}/live-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // ignore
  }
};

export const fetchLiveLocation = async (familiaId: string) => {
  if (!familiaId || familiaId === 'local-family-id') return null;
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/live-location`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        return json.data;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

// 11. Sincronizar Estado del Teléfono
export const syncPhoneStatus = async (familiaId: string, status: PhoneStatus) => {
  if (!familiaId || familiaId === 'local-family-id') return;
  try {
    await fetch(`/api/familias/${encodeURIComponent(familiaId)}/phone-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status),
    });
  } catch {
    // ignore
  }
  void reportPhoneStatusToSupabase(familiaId, status);
};

export const fetchPhoneStatus = async (familiaId: string): Promise<PhoneStatus | null> => {
  if (!familiaId || familiaId === 'local-family-id') return null;

  // 1) Lo que reportó el teléfono, leído directo de Supabase (es la fuente real).
  const client = getSupabaseClient();
  if (client) {
    try {
      const realId = await toFamiliaUuid(client, familiaId);
      if (realId) {
        const { data, error } = await client
          .schema(DB_SCHEMA)
          .from('estado_telefono')
          .select('*')
          .eq('familia_id', realId)
          .maybeSingle();
        if (!error && data) {
          return {
            isOnline: Boolean(data.is_online),
            batteryLevel: Number(data.battery_level),
            isCharging: Boolean(data.is_charging),
            appVersion: data.app_version || '',
            missingPermissions: Array.isArray(data.missing_permissions) ? data.missing_permissions : [],
            isHomeScreen: Boolean(data.is_home_screen),
            isSynced: true,
            lastReportTime: data.last_reported_at ? new Date(data.last_reported_at).getTime() : 0,
            lastLocation:
              typeof data.last_lat === 'number' && typeof data.last_lng === 'number'
                ? {
                    lat: data.last_lat,
                    lng: data.last_lng,
                    accuracy: Number(data.last_accuracy) || 0,
                    time: data.last_location_at ? new Date(data.last_location_at).getTime() : 0,
                  }
                : null,
          };
        }
      }
    } catch {
      // se prueba el servidor propio
    }
  }

  // 2) Servidor propio (solo existe si la web corre con server.ts).
  try {
    const res = await fetch(`/api/familias/${encodeURIComponent(familiaId)}/phone-status`);
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
      const json = await res.json();
      if (json && json.success && json.data) {
        return json.data;
      }
    }
  } catch {
    // ignore
  }
  return null;
};

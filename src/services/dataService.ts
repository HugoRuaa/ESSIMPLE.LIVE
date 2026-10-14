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
      body: JSON.stringify({ email: cleanEmail, password_hash }),
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

    if (data.password_hash !== password_hash) {
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

// 6. Reportar Estado del Teléfono en essimple.estado_telefono
export const reportPhoneStatusToSupabase = async (familiaId: string, status: PhoneStatus) => {
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return;

  try {
    await client.schema(DB_SCHEMA).from('estado_telefono').upsert({
      familia_id: familiaId,
      is_online: status.isOnline,
      battery_level: status.batteryLevel,
      is_charging: status.isCharging,
      app_version: status.appVersion,
      missing_permissions: status.missingPermissions,
      is_home_screen: status.isHomeScreen,
      last_reported_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error al reportar estado a Supabase:', err);
  }
};

// 7. Registrar Evento en essimple.eventos
export const logEventToSupabase = async (familiaId: string, event: Omit<EventItem, 'id' | 'createdAtMs'>) => {
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return;

  try {
    await client.schema(DB_SCHEMA).from('eventos').insert({
      familia_id: familiaId,
      event_type: event.type,
      title: event.title,
      detail: event.detail,
      level: event.level,
      failed_contacts: event.failedContacts || [],
    });
  } catch (err) {
    console.error('Error al registrar evento en Supabase:', err);
  }
};

// 8. Registrar Cambio en essimple.cambios
export const logChangeToSupabase = async (familiaId: string, description: string) => {
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return;

  try {
    await client.schema(DB_SCHEMA).from('cambios').insert({
      familia_id: familiaId,
      description,
    });
  } catch (err) {
    console.error('Error al registrar cambio en Supabase:', err);
  }
};

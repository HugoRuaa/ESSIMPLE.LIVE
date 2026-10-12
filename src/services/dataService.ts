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
      console.log('✅ Familia registrada en Supabase vía API del servidor:', data.familiaId);
      return { success: true, familiaId: data.familiaId, message: data.message || 'Cuenta familiar creada con éxito en Supabase' };
    } else if (data.message) {
      console.warn('⚠️ Error al registrar vía API:', data.message);
      return { success: false, message: data.message };
    }
  } catch (apiErr) {
    console.warn('Endpoint /api/familias/register no disponible, intentando cliente directo Supabase...', apiErr);
  }

  // Intento 2: Directo desde el navegador con cliente Supabase
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'No se pudo conectar con Supabase. Revisa la URL y llaves en el archivo .env o en Ajustes.',
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
        return { success: false, message: 'Este correo ya tiene una cuenta registrada en essimple.familias.' };
      }
      return { success: false, message: `Error de Supabase: ${error.message}` };
    }

    console.log('✅ Familia registrada directamente en Supabase:', data.id);
    return { success: true, familiaId: data.id, message: 'Cuenta creada con éxito en Supabase' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Error al registrar en Supabase' };
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
    return { success: false, message: 'No se pudo conectar a la base de datos de Supabase.' };
  }

  try {
    const { data, error } = await client
      .schema(DB_SCHEMA)
      .from('familias')
      .select('id, exit_pin, person_name, font_size, country_code, password_hash')
      .eq('email', cleanEmail)
      .single();

    if (error || !data) {
      return { success: false, message: 'Correo no registrado en Supabase.' };
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
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return;

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
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return null;

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

// 5. Sincronizar Casa y Zona con essimple.casa_zona
export const syncHomeZoneToSupabase = async (familiaId: string, settings: AppSettings) => {
  const client = getSupabaseClient();
  if (!client || !familiaId || familiaId === 'local-family-id') return;

  try {
    await client.schema(DB_SCHEMA).from('casa_zona').upsert({
      familia_id: familiaId,
      home_address: settings.homeAddress,
      home_lat: settings.homeCenter.lat,
      home_lng: settings.homeCenter.lng,
      travel_mode: settings.travelMode,
      safe_zone_active: settings.safeZoneActive,
      safe_zone_lat: settings.safeZoneCenter.lat,
      safe_zone_lng: settings.safeZoneCenter.lng,
      safe_zone_address: settings.safeZoneCenter.address,
      safe_zone_radius: settings.safeZoneRadius,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error al sincronizar casa y zona con Supabase:', err);
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

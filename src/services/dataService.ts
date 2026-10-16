import { getSupabaseClient, DB_SCHEMA } from '../lib/supabase';
import { getDeviceToken, isDeviceMode, setDeviceToken, clearDeviceToken } from '../lib/device';
import { storePinHash, clearPinHash } from '../lib/pin';
import { Contact, AppSettings, EventItem, ChangeItem, PhoneStatus } from '../types';

// ====================================================================
// Capa de datos con dos identidades, ambas verificadas por el servidor:
//  - Familia (panel): sesión de Supabase Auth. Cada fila se filtra por dueño (RLS).
//  - Teléfono: token de dispositivo. Solo puede usar las funciones dispositivo_* (rpc).
// Ya no hay rutas /api ni acceso con la llave pública a las tablas.
// El parámetro familiaId se mantiene en las firmas por compatibilidad, pero el servidor
// decide la familia según la sesión o el token: un id de otra familia no sirve de nada.
// ====================================================================

const NO_FAMILY = 'local-family-id';
const noFamily = (id?: string | null) => !id || id === NO_FAMILY;

const db = () => {
  const client = getSupabaseClient();
  return client ? client.schema(DB_SCHEMA) : null;
};

// ---------- Sesión de la familia ----------

export interface FamilyData {
  id: string;
  email: string;
  person_name: string;
  font_size: string;
  country_code: string;
}

const FAMILY_COLUMNS = 'id, email, person_name, font_size, country_code';

/** Devuelve la familia de la sesión abierta, o null si no hay sesión. */
export const getSessionFamily = async (): Promise<FamilyData | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: sess } = await client.auth.getSession();
    if (!sess.session) return null;
    const { data, error } = await client.schema(DB_SCHEMA).from('familias').select(FAMILY_COLUMNS).maybeSingle();
    if (error || !data) return null;
    return data as FamilyData;
  } catch {
    return null;
  }
};

let cachedFamilyId: { uid: string; id: string } | null = null;

/** Id de la familia de la sesión (para armar filas propias). */
export const getMyFamiliaId = async (): Promise<string | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: sess } = await client.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return null;
    if (cachedFamilyId?.uid === uid) return cachedFamilyId.id;
    const { data } = await client.schema(DB_SCHEMA).from('familias').select('id').maybeSingle();
    if (!data?.id) return null;
    cachedFamilyId = { uid, id: data.id };
    return data.id;
  } catch {
    return null;
  }
};

/** Compatibilidad: antes devolvía el uuid a partir del correo; ahora es siempre el de la sesión. */
export const getFamiliaUuid = async (_idOrEmail?: string): Promise<string | null> => getMyFamiliaId();

export const registerFamily = async (
  email: string,
  password: string,
  pin: string,
  personName = 'Mi familiar'
): Promise<{ success: boolean; familiaId?: string; message?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' };
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await client.auth.signUp({ email: cleanEmail, password });
    if (error) {
      const m = (error.message || '').toLowerCase();
      if (m.includes('already') || m.includes('registered')) {
        return { success: false, message: 'Este correo ya tiene una cuenta registrada.' };
      }
      if (m.includes('password')) {
        return { success: false, message: 'La contraseña es muy débil. Usa al menos 10 caracteres.' };
      }
      return { success: false, message: error.message || 'No se pudo crear la cuenta.' };
    }
    // Si el proyecto exigiera confirmar el correo, no habría sesión: no hay flujo de correo en essimple.
    if (!data.session) {
      return { success: false, message: 'La cuenta no se pudo abrir. Escribe a consultas@insightproviders.cc.' };
    }
    const { data: famId, error: rpcErr } = await client
      .schema(DB_SCHEMA)
      .rpc('crear_mi_familia', { p_person_name: personName, p_pin: pin });
    if (rpcErr) {
      await client.auth.signOut();
      return { success: false, message: rpcErr.message || 'No se pudo crear la familia.' };
    }
    cachedFamilyId = null;
    return { success: true, familiaId: famId as string, message: 'Cuenta creada con éxito' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Error al registrar' };
  }
};

export const loginFamily = async (
  email: string,
  password: string
): Promise<{ success: boolean; familiaId?: string; familyData?: FamilyData; message?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'No se pudo conectar con el servidor.' };
  try {
    const { error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      // Mismo mensaje para correo inexistente o clave errada: no revela qué correos tienen cuenta.
      return { success: false, message: 'Correo o contraseña incorrectos.' };
    }
    cachedFamilyId = null;
    const family = await getSessionFamily();
    if (!family) {
      await client.auth.signOut();
      return { success: false, message: 'Esta cuenta no tiene familia asociada. Escribe a consultas@insightproviders.cc.' };
    }
    return { success: true, familiaId: family.id, familyData: family };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Error al iniciar sesión' };
  }
};

export const logoutFamily = async (): Promise<void> => {
  cachedFamilyId = null;
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch {
    // sin conexión: la sesión local igual se descarta
  }
};

/** Cambia el PIN de salida del teléfono (se guarda con hash en el servidor). */
export const changePin = async (pin: string): Promise<{ success: boolean; message?: string }> => {
  const d = db();
  if (!d) return { success: false, message: 'Sin conexión.' };
  const { error } = await d.rpc('cambiar_pin', { p_pin: pin });
  return error ? { success: false, message: error.message } : { success: true };
};

/** Borra la cuenta y todos sus datos (familia, contactos, casa, estado, eventos, teléfonos). */
export const deleteMyAccount = async (): Promise<{ success: boolean; message?: string }> => {
  const d = db();
  if (!d) return { success: false, message: 'Sin conexión.' };
  const { error } = await d.rpc('eliminar_mi_cuenta');
  if (error) return { success: false, message: error.message };
  await logoutFamily();
  return { success: true };
};

// ---------- Vincular el teléfono ----------

/** La familia pide un código de 8 caracteres, válido 15 minutos y de un solo uso. */
export const createLinkCode = async (): Promise<string | null> => {
  const d = db();
  if (!d) return null;
  const { data, error } = await d.rpc('crear_codigo_vinculo');
  return error || !data ? null : (data as string);
};

/** El teléfono canjea el código y guarda su token. */
export const redeemLinkCode = async (code: string): Promise<{ success: boolean; message?: string }> => {
  const d = db();
  if (!d) return { success: false, message: 'Sin conexión.' };
  const { data, error } = await d.rpc('vincular_dispositivo', { p_code: code });
  if (error) return { success: false, message: error.message };
  if (!data) return { success: false, message: 'El código no es válido o ya venció. Pide uno nuevo en el panel.' };
  setDeviceToken(data as string);
  return { success: true };
};

/** La familia desvincula todos los teléfonos. */
export const unlinkPhones = async (): Promise<boolean> => {
  const d = db();
  if (!d) return false;
  const { error } = await d.rpc('desvincular_telefonos');
  return !error;
};

/** El teléfono olvida su token (por ejemplo, si el servidor ya lo revocó). */
export const forgetDevice = (): void => {
  clearDeviceToken();
  clearPinHash();
};

// ---------- Lo que el teléfono recibe de la familia ----------

interface DeviceConfig {
  pin_hash?: string | null;
  familia: { person_name: string; font_size: string; country_code: string; quick_messages: string[] } | null;
  casa: any | null;
  contactos: any[];
}

let configCache: { at: number; value: Promise<DeviceConfig | null> } | null = null;

/** Configuración del teléfono (contactos, casa y zona, nombre, letra, mensajes). Se reutiliza 5 s. */
export const fetchDeviceConfig = async (): Promise<DeviceConfig | null> => {
  const token = getDeviceToken();
  const d = db();
  if (!token || !d) return null;
  if (configCache && Date.now() - configCache.at < 5000) return configCache.value;
  const value = (async () => {
    const { data, error } = await d.rpc('dispositivo_config', { p_token: token });
    if (error) {
      // 28000 = token revocado o desconocido: este teléfono ya no está vinculado.
      if ((error as any).code === '28000' || /no autorizado/i.test(error.message || '')) {
        clearDeviceToken();
        clearPinHash();
      }
      return null;
    }
    // Guarda el hash del PIN para poder comprobarlo sin señal.
    storePinHash((data as DeviceConfig)?.pin_hash);
    return data as DeviceConfig;
  })();
  configCache = { at: Date.now(), value };
  return value;
};

const mapContact = (item: any): Contact => ({
  id: item.id,
  name: item.name,
  phone: item.phone,
  photoUrl: item.photo_url || undefined,
  avatarColor: item.avatar_color,
  isEmergency: item.is_emergency,
  isSafeZone: item.is_safe_zone,
  isLowBattery: item.is_low_battery,
  order: item.display_order,
});

const mapHomeZone = (item: any): Partial<AppSettings> => {
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
      lat: !isNaN(szLat) ? szLat : !isNaN(lat) ? lat : 4.6097,
      lng: !isNaN(szLng) ? szLng : !isNaN(lng) ? lng : -74.0817,
      address: item.safe_zone_address || item.home_address || '',
    },
    safeZoneRadius: Number(item.safe_zone_radius) || 300,
  };
};

/** Datos básicos de la persona acompañada para el teléfono (nombre, letra, país). */
export const fetchDevicePerson = async (): Promise<{ personName: string; fontSize: string; countryCode: string } | null> => {
  const cfg = await fetchDeviceConfig();
  if (!cfg?.familia) return null;
  return {
    personName: cfg.familia.person_name,
    fontSize: cfg.familia.font_size,
    countryCode: cfg.familia.country_code,
  };
};

/** El teléfono pregunta al servidor si el PIN es correcto. Bloquea 15 min tras 5 fallos. */
export const verifyDevicePin = async (
  pin: string
): Promise<{ ok: boolean; blocked: boolean; offline?: boolean }> => {
  const token = getDeviceToken();
  const d = db();
  if (!token || !d) return { ok: false, blocked: false, offline: true };
  try {
    const { data, error } = await d.rpc('dispositivo_verificar_pin', { p_token: token, p_pin: pin });
    if (error || !data) return { ok: false, blocked: false, offline: true };
    return { ok: Boolean((data as any).ok), blocked: Boolean((data as any).bloqueado) };
  } catch {
    return { ok: false, blocked: false, offline: true };
  }
};

// ---------- Contactos ----------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Se actualiza por id y solo se borra lo que ya no está: borrar todo y volver a crear
// revocaría los avisos de los contactos en cada guardado.
export const syncContactsToSupabase = async (familiaId: string, contacts: Contact[]) => {
  if (noFamily(familiaId) || isDeviceMode()) return;
  const d = db();
  const fid = await getMyFamiliaId();
  if (!d || !fid) return;
  try {
    const toRow = (c: Contact) => ({
      familia_id: fid,
      name: c.name,
      phone: c.phone,
      photo_url: c.photoUrl || null,
      avatar_color: c.avatarColor,
      is_emergency: c.isEmergency,
      is_safe_zone: c.isSafeZone,
      is_low_battery: c.isLowBattery,
      display_order: c.order,
    });
    const { data: existing } = await d.from('contactos').select('id');
    const existingIds = new Set<string>((existing || []).map((r: { id: string }) => r.id));
    const keep = contacts.filter(c => UUID_RE.test(c.id) && existingIds.has(c.id));
    const fresh = contacts.filter(c => !(UUID_RE.test(c.id) && existingIds.has(c.id)));

    if (keep.length > 0) {
      await d.from('contactos').upsert(keep.map(c => ({ id: c.id, ...toRow(c) })), { onConflict: 'id' });
    }
    if (fresh.length > 0) {
      await d.from('contactos').insert(fresh.map(c => (UUID_RE.test(c.id) ? { id: c.id, ...toRow(c) } : toRow(c))));
    }
    const keepIds = new Set(keep.map(c => c.id));
    const gone = [...existingIds].filter(id => !keepIds.has(id));
    if (gone.length > 0) await d.from('contactos').delete().in('id', gone);
  } catch (err) {
    console.error('Error al sincronizar contactos:', err);
  }
};

export const fetchFamilyContacts = async (familiaId: string): Promise<Contact[] | null> => {
  if (noFamily(familiaId)) return null;
  if (isDeviceMode()) {
    const cfg = await fetchDeviceConfig();
    return cfg ? cfg.contactos.map(mapContact) : null;
  }
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('contactos').select('*').order('display_order', { ascending: true });
    if (error || !data) return null;
    return data.map(mapContact);
  } catch {
    return null;
  }
};

// ---------- Casa y zona segura ----------

export const syncHomeZoneToSupabase = async (
  familiaId: string,
  settings: AppSettings
): Promise<{ success: boolean; familiaId?: string; message?: string }> => {
  if (noFamily(familiaId)) {
    return { success: false, message: 'No hay cuenta familiar iniciada para asociar la ubicación.' };
  }
  if (isDeviceMode()) return { success: false, message: 'Solo la familia puede cambiar la casa.' };
  const d = db();
  const fid = await getMyFamiliaId();
  if (!d || !fid) return { success: false, message: 'No hay conexión disponible.' };

  const rawMode = String(settings.travelMode || '').toLowerCase();
  const travelMode: 'pie' | 'transporte' = rawMode.includes('transporte') || rawMode === 'bus' ? 'transporte' : 'pie';
  const homeLat = typeof settings.homeCenter?.lat === 'number' && !isNaN(settings.homeCenter.lat) ? settings.homeCenter.lat : 4.6097;
  const homeLng = typeof settings.homeCenter?.lng === 'number' && !isNaN(settings.homeCenter.lng) ? settings.homeCenter.lng : -74.0817;
  const szLat = typeof settings.safeZoneCenter?.lat === 'number' && !isNaN(settings.safeZoneCenter.lat) ? settings.safeZoneCenter.lat : homeLat;
  const szLng = typeof settings.safeZoneCenter?.lng === 'number' && !isNaN(settings.safeZoneCenter.lng) ? settings.safeZoneCenter.lng : homeLng;
  const radius = typeof settings.safeZoneRadius === 'number' ? Math.round(settings.safeZoneRadius) : 300;

  try {
    const { error } = await d.from('casa_zona').upsert(
      {
        familia_id: fid,
        home_address: settings.homeAddress || '',
        home_lat: homeLat,
        home_lng: homeLng,
        travel_mode: travelMode,
        safe_zone_active: !!settings.safeZoneActive,
        safe_zone_lat: szLat,
        safe_zone_lng: szLng,
        safe_zone_address: settings.safeZoneCenter?.address || settings.homeAddress || '',
        safe_zone_radius: radius,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'familia_id' }
    );
    if (error) return { success: false, message: error.message };
    return { success: true, familiaId: fid, message: 'Ubicación de casa y zona guardadas exitosamente' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Error inesperado al guardar' };
  }
};

export const fetchFamilyHomeZone = async (familiaId: string): Promise<Partial<AppSettings> | null> => {
  if (noFamily(familiaId)) return null;
  if (isDeviceMode()) {
    const cfg = await fetchDeviceConfig();
    return cfg?.casa ? mapHomeZone(cfg.casa) : null;
  }
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('casa_zona').select('*').maybeSingle();
    if (error || !data) return null;
    return mapHomeZone(data);
  } catch {
    return null;
  }
};

// ---------- Estado y ubicación del teléfono ----------
// Solo el teléfono escribe (rpc dispositivo_reportar). La familia solo lee.

const reportDevice = async (fields: Record<string, unknown>): Promise<void> => {
  const token = getDeviceToken();
  const d = db();
  if (!token || !d) return;
  try {
    const { error } = await d.rpc('dispositivo_reportar', { p_token: token, ...fields });
    if (error && ((error as any).code === '28000' || /no autorizado/i.test(error.message || ''))) clearDeviceToken();
  } catch (err) {
    console.warn('Aviso reportando estado del teléfono:', err);
  }
};

export const reportPhoneStatusToSupabase = async (_familiaId: string, status: PhoneStatus) => {
  await reportDevice({
    p_online: status.isOnline,
    p_battery: Math.round(status.batteryLevel),
    p_charging: status.isCharging,
    p_app_version: status.appVersion,
    p_missing: status.missingPermissions,
    p_home_screen: status.isHomeScreen,
  });
};

export const syncPhoneStatus = async (familiaId: string, status: PhoneStatus) => {
  if (noFamily(familiaId) || !isDeviceMode()) return;
  await reportPhoneStatusToSupabase(familiaId, status);
};

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
  if (noFamily(familiaId) || !isDeviceMode()) return;
  await reportDevice({
    p_lat: data.lat,
    p_lng: data.lng,
    p_accuracy: Math.round(data.accuracy || 20),
    p_sharing: Boolean(data.isSharing),
  });
};

export const fetchLiveLocation = async (familiaId: string) => {
  if (noFamily(familiaId) || isDeviceMode()) return null;
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('estado_telefono').select('*').maybeSingle();
    if (error || !data) return null;
    if (typeof data.last_lat !== 'number' || typeof data.last_lng !== 'number') return null;
    return {
      isSharing: Boolean(data.is_sharing),
      contactName: 'Familia',
      expiresAt: 0,
      lat: Number(data.last_lat),
      lng: Number(data.last_lng),
      address: `Ubicación actual (${Number(data.last_lat).toFixed(5)}, ${Number(data.last_lng).toFixed(5)})`,
      accuracy: Number(data.last_accuracy) || 20,
    };
  } catch {
    return null;
  }
};

export const fetchPhoneStatus = async (familiaId: string): Promise<PhoneStatus | null> => {
  if (noFamily(familiaId) || isDeviceMode()) return null;
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('estado_telefono').select('*').maybeSingle();
    if (error || !data) return null;
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
  } catch {
    return null;
  }
};

// ---------- Eventos y cambios (el servidor conserva solo los últimos 50) ----------

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

export const logEventToSupabase = async (familiaId: string, event: Omit<EventItem, 'id' | 'createdAtMs'>) => {
  if (noFamily(familiaId)) return;
  const d = db();
  if (!d) return;
  try {
    if (isDeviceMode()) {
      await d.rpc('dispositivo_evento', {
        p_token: getDeviceToken(),
        p_type: event.type,
        p_title: event.title,
        p_detail: event.detail,
        p_level: event.level,
        p_failed: event.failedContacts || null,
      });
      return;
    }
    const fid = await getMyFamiliaId();
    if (!fid) return;
    await d.from('eventos').insert({
      familia_id: fid,
      event_type: event.type,
      title: event.title,
      detail: event.detail,
      level: event.level,
      failed_contacts: event.failedContacts || [],
    });
  } catch (err) {
    console.error('Error al registrar evento:', err);
  }
};

export const fetchFamilyEvents = async (familiaId: string): Promise<EventItem[] | null> => {
  if (noFamily(familiaId) || isDeviceMode()) return null;
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('eventos').select('*').order('created_at', { ascending: false }).limit(50);
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
    console.error('Error al consultar eventos:', err);
    return null;
  }
};

export const logChangeToSupabase = async (familiaId: string, description: string) => {
  if (noFamily(familiaId) || isDeviceMode()) return;
  const d = db();
  const fid = await getMyFamiliaId();
  if (!d || !fid) return;
  try {
    await d.from('cambios').insert({ familia_id: fid, description });
  } catch (err) {
    console.error('Error al registrar cambio:', err);
  }
};

export const fetchFamilyChanges = async (familiaId: string): Promise<ChangeItem[] | null> => {
  if (noFamily(familiaId) || isDeviceMode()) return null;
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('cambios').select('*').order('created_at', { ascending: false }).limit(50);
    if (error || !data) return null;
    return data.map(row => {
      const createdDate = row.created_at ? new Date(row.created_at) : new Date();
      return {
        id: row.id,
        description: row.description,
        timestamp:
          createdDate.toLocaleDateString([], { day: 'numeric', month: 'short' }) +
          ' ' +
          createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAtMs: createdDate.getTime(),
      };
    });
  } catch (err) {
    console.error('Error al consultar cambios:', err);
    return null;
  }
};

// ---------- Avisos a contactos (enlace con token propio) ----------

/** La familia crea el enlace de un contacto. Devuelve el token que va en la dirección. */
export const createAvisoToken = async (phoneDigits: string): Promise<string | null> => {
  const d = db();
  if (!d) return null;
  const { data, error } = await d.rpc('crear_enlace_aviso', { p_phone: phoneDigits });
  return error || !data ? null : (data as string);
};

/** El celular del contacto pregunta a quién cuida. Devuelve null si el enlace no es válido o fue revocado. */
export const fetchAvisoInfo = async (token: string): Promise<{ personName: string } | null> => {
  const d = db();
  if (!d || !token) return null;
  const { data, error } = await d.rpc('aviso_info', { p_token: token });
  if (error || !data) return null;
  return { personName: (data as { person_name?: string }).person_name || '' };
};

export const subscribeAviso = async (
  token: string,
  sub: { endpoint: string; p256dh?: string; auth?: string }
): Promise<{ success: boolean; message?: string }> => {
  const d = db();
  if (!d) return { success: false, message: 'Sin conexión con el servidor' };
  const { error } = await d.rpc('aviso_suscribir', {
    p_token: token,
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh || '',
    p_auth: sub.auth || '',
  });
  return error ? { success: false, message: /no válido/i.test(error.message) ? 'Este enlace ya no sirve. Pide uno nuevo.' : error.message } : { success: true };
};

// ---------- Perfil de la persona acompañada ----------

export const syncFamilyProfile = async (
  familiaId: string,
  profile: { personName?: string; countryCode?: string; fontSize?: string }
): Promise<void> => {
  if (noFamily(familiaId) || isDeviceMode()) return;
  const d = db();
  const fid = await getMyFamiliaId();
  if (!d || !fid) return;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (profile.personName !== undefined) patch.person_name = profile.personName.slice(0, 20);
  if (profile.countryCode !== undefined) patch.country_code = String(profile.countryCode).replace(/\D/g, '') || '57';
  if (profile.fontSize !== undefined) patch.font_size = profile.fontSize;
  try {
    await d.from('familias').update(patch).eq('id', fid);
  } catch (err) {
    console.warn('Aviso guardando el perfil:', err);
  }
};

// ---------- Mensajes rápidos ----------

export const syncQuickMessagesToSupabase = async (familiaId: string, messages: string[]) => {
  if (noFamily(familiaId) || isDeviceMode()) return;
  const d = db();
  const fid = await getMyFamiliaId();
  if (!d || !fid) return;
  try {
    await d.from('familias').update({ quick_messages: messages, updated_at: new Date().toISOString() }).eq('id', fid);
  } catch (err) {
    console.warn('Aviso guardando mensajes rápidos:', err);
  }
};

export const fetchFamilyQuickMessages = async (familiaId: string): Promise<string[] | null> => {
  if (noFamily(familiaId)) return null;
  if (isDeviceMode()) {
    const cfg = await fetchDeviceConfig();
    const q = cfg?.familia?.quick_messages;
    return Array.isArray(q) && q.length > 0 ? q : null;
  }
  const d = db();
  if (!d) return null;
  try {
    const { data, error } = await d.from('familias').select('quick_messages').maybeSingle();
    if (!error && Array.isArray(data?.quick_messages) && data!.quick_messages.length > 0) return data!.quick_messages;
  } catch {
    // sin datos
  }
  return null;
};

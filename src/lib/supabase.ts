import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local storage keys for the 2 secrets
const STORAGE_KEY_URL = 'essimple_supabase_url';
const STORAGE_KEY_KEY = 'essimple_supabase_anon_key';

export const DEFAULT_SUPABASE_URL = 'https://mlhsbihiwrrowlxuzqvf.supabase.co';
// La llave NO va en el código: se lee de VITE_SUPABASE_ANON_KEY (llave publicable, sb_publishable_…).
export const DEFAULT_SUPABASE_ANON_KEY = '';
export const DEFAULT_SUPABASE_SCHEMA = 'essimple';

let cachedClient: SupabaseClient<any, any> | null = null;

export const DB_SCHEMA =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_SCHEMA as string)) ||
  (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_SCHEMA || process.env?.SUPABASE_SCHEMA : '') ||
  DEFAULT_SUPABASE_SCHEMA;

export const getSupabaseConfig = () => {
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_URL as string)) ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : '') ||
    '';
  const envAnonKey =
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_ANON_KEY as string)) ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY : '') ||
    '';

  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  // If storedUrl is empty or placeholder, prefer envUrl or DEFAULT_SUPABASE_URL
  const cleanStoredUrl = (storedUrl && !storedUrl.includes('tu-proyecto')) ? storedUrl.trim() : '';
  const cleanStoredKey = (storedKey && !storedKey.includes('tu_supabase_anon_key')) ? storedKey.trim() : '';

  const url = cleanStoredUrl || envUrl || DEFAULT_SUPABASE_URL;
  const anonKey = cleanStoredKey || envAnonKey || DEFAULT_SUPABASE_ANON_KEY;

  return { url, anonKey };
};

export const saveSupabaseConfig = (url: string, anonKey: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
  cachedClient = null; // reset client
};

export const clearSupabaseConfig = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  cachedClient = null;
};

export const getSupabaseClient = (): SupabaseClient<any, any> | null => {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      db: {
        schema: DB_SCHEMA,
      },
      auth: {
        // La sesión de la familia (tokens, nunca la clave) se guarda en el navegador y se renueva sola.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'essimple_auth',
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Error al inicializar cliente de Supabase:', err);
    return null;
  }
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  // First test server-side endpoint if available
  try {
    const apiRes = await fetch('/api/supabase/test');
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.success) {
        return { success: true, message: `¡Conexión exitosa al esquema "${DB_SCHEMA}" en Supabase!` };
      }
    }
  } catch {
    // continue to direct client test
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Falta la dirección (URL) o la llave pública de Supabase.' };
  }

  try {
    // Probar consulta contra el esquema essimple
    const { error } = await client.schema(DB_SCHEMA).from('familias').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.toLowerCase().includes('relation') || error.message.toLowerCase().includes('schema')) {
        return {
          success: true,
          message: 'Conectado al proyecto Supabase. Asegúrate de ejecutar supabase-schema.sql y verificar que "essimple" esté en Settings > API > Exposed schemas.',
        };
      }
      return { success: false, message: `Error de Supabase: ${error.message}` };
    }
    return { success: true, message: `¡Conexión exitosa al esquema "${DB_SCHEMA}" en Supabase!` };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error desconocido al conectar con Supabase.',
    };
  }
};

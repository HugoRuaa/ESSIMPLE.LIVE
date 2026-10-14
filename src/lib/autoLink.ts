import { getSupabaseClient } from './supabase';

/** Dirección pública del sitio: lo que se comparte con la persona acompañada. */
export const siteOrigin = (): string => {
  const o = typeof window !== 'undefined' ? window.location.origin : '';
  return o && !/localhost|127\.0\.0\.1|capacitor/.test(o) ? o : 'https://essimple.live';
};

/** Enlace que se envía: abre la página de descarga y deja anotado quién lo envió. */
export const buildInstallLink = (code: string): string => `${siteOrigin()}/d/${code}`;

/** Anota en Supabase que este celular empezó la descarga del enlace de la familia. */
export const registerDownload = async (email: string): Promise<boolean> => {
  const sb = getSupabaseClient();
  if (!sb) return false;
  try {
    const { data, error } = await sb.rpc('registrar_descarga', { p_email: email });
    return !error && data === true;
  } catch {
    return false;
  }
};

export type PendingLink = { count: number; email: string | null; error: 'missing_function' | 'other' | null };

/** Busca si hay una descarga reciente hecha desde la misma red que esta app (máximo 6 s de espera). */
export const findPendingLink = async (): Promise<PendingLink> => {
  const sb = getSupabaseClient();
  if (!sb) return { count: 0, email: null, error: 'other' };
  try {
    const result = await Promise.race([
      sb.rpc('buscar_vinculo'),
      new Promise<{ data: null; error: { code: string } }>(resolve => setTimeout(() => resolve({ data: null, error: { code: 'timeout' } }), 6000)),
    ]);
    const { data, error } = result as { data: any; error: any };
    if (error) {
      const missing = error.code === 'PGRST202' || error.code === '42883' || /could not find the function|does not exist/i.test(error.message || '');
      return { count: 0, email: null, error: missing ? 'missing_function' : 'other' };
    }
    if (!data) return { count: 0, email: null, error: null };
    return { count: Number(data.count) || 0, email: data.email || null, error: null };
  } catch {
    return { count: 0, email: null, error: 'other' };
  }
};

export const markLinkUsed = async (email: string): Promise<void> => {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    await sb.rpc('marcar_vinculo_usado', { p_email: email });
  } catch {
    // ignorar
  }
};

/** m***@gmail.com */
export const maskEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  return `${user.slice(0, 1)}***@${domain}`;
};

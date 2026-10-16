/** Llave pública (VAPID) para las notificaciones. Es pública; la privada vive solo en Supabase. */
export const VAPID_PUBLIC_KEY: string =
  (import.meta.env?.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  'BBxX-Wo_NRHexJJ3uvzfRW_UgLW64FVZ7c0l6T2sny15ddWcJj3aW8Nbk8IgkR3XbNvFvddatEAaD86BPTbZ0jc';

export const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

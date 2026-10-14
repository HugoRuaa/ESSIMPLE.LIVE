/**
 * Cargador de essimple.live.
 *
 * - En el navegador: arranca la app normal.
 * - En el APK de Android: intenta traer la versión más reciente desde el sitio (para no tener que reinstalar en cada cambio).
 *   Si el sitio no responde, tarda, falla o la versión nueva se rompe, arranca con el código que el APK lleva dentro.
 *
 * Este archivo no importa nada de la app a propósito: es lo único que queda "congelado" dentro del APK, así que debe ser
 * simple y estable.
 */
const LIVE_ORIGIN: string = (import.meta.env?.VITE_LIVE_ORIGIN as string | undefined) || 'https://essimple.live';
const KEY_ATTEMPT = 'essimple_live_attempt';
const KEY_BLOCK = 'essimple_live_block';
const BLOCK_MS = 30 * 60 * 1000;

const w = window as any;
const isNativeApp = !!w.Capacitor?.isNativePlatform?.();

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // ignorar
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignorar
    }
  },
};

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      v => {
        clearTimeout(t);
        resolve(v);
      },
      e => {
        clearTimeout(t);
        reject(e);
      }
    );
  });

async function startLocal() {
  const mod = await import('./app-entry');
  mod.start();
}

async function startLive(): Promise<boolean> {
  // Si el intento anterior no llegó a dibujar la app (pantalla en blanco, cierre), se usa el respaldo un rato.
  if (store.get(KEY_ATTEMPT)) {
    store.del(KEY_ATTEMPT);
    store.set(KEY_BLOCK, String(Date.now() + BLOCK_MS));
    return false;
  }
  if (Date.now() < Number(store.get(KEY_BLOCK) || 0)) return false;

  try {
    const res = await withTimeout(fetch(`${LIVE_ORIGIN}/live.json?t=${Date.now()}`, { cache: 'no-store' }), 3000);
    if (!res.ok) return false;
    const info = await res.json();
    if (!info || typeof info.app !== 'string') return false;

    store.set(KEY_ATTEMPT, String(Date.now()));

    for (const href of (info.css as string[] | undefined) || []) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LIVE_ORIGIN + href;
      document.head.appendChild(link);
    }

    const mod = await withTimeout(import(/* @vite-ignore */ LIVE_ORIGIN + info.app), 8000);
    if (typeof (mod as any).start !== 'function') throw new Error('sin start');
    (mod as any).start();
    return true;
  } catch {
    store.del(KEY_ATTEMPT);
    return false;
  }
}

(async () => {
  if (isNativeApp && (await startLive())) return;
  await startLocal();
})();

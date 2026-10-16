import bcrypt from 'bcryptjs';

// PIN de salida del teléfono, comprobado en el propio teléfono para que funcione sin señal.
// El servidor entrega solo el hash (bcrypt); el PIN en claro no se guarda en ningún lado.
// Es una traba para la persona acompañada: quien extraiga los datos de la app podría probar los 10.000 PIN,
// por eso no se presenta como protección fuerte. Tras 5 fallos se bloquea 15 minutos.
const HASH_KEY = 'essimple_pin_hash';
const FAILS_KEY = 'essimple_pin_fails';
const LOCK_KEY = 'essimple_pin_lock_until';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null): void => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    // sin almacenamiento
  }
};

/** Guarda el hash que entrega el servidor (se actualiza cada vez que el teléfono se conecta). */
export const storePinHash = (hash: string | null | undefined): void => {
  if (typeof hash === 'string' && hash.startsWith('$2')) write(HASH_KEY, hash);
};

export const hasPinHash = (): boolean => !!read(HASH_KEY);

export const clearPinHash = (): void => {
  write(HASH_KEY, null);
  write(FAILS_KEY, null);
  write(LOCK_KEY, null);
};

export type LocalPinResult = { ok: boolean; blocked: boolean; noHash: boolean };

export const verifyPinLocal = async (pin: string): Promise<LocalPinResult> => {
  const hash = read(HASH_KEY);
  if (!hash) return { ok: false, blocked: false, noHash: true };

  const lockUntil = Number(read(LOCK_KEY) || 0);
  if (lockUntil > Date.now()) return { ok: false, blocked: true, noHash: false };

  let ok = false;
  try {
    ok = await bcrypt.compare(pin, hash);
  } catch {
    ok = false;
  }
  if (ok) {
    write(FAILS_KEY, null);
    write(LOCK_KEY, null);
    return { ok: true, blocked: false, noHash: false };
  }
  const fails = Number(read(FAILS_KEY) || 0) + 1;
  if (fails >= MAX_FAILS) {
    write(FAILS_KEY, null);
    write(LOCK_KEY, String(Date.now() + LOCK_MS));
    return { ok: false, blocked: true, noHash: false };
  }
  write(FAILS_KEY, String(fails));
  return { ok: false, blocked: false, noHash: false };
};

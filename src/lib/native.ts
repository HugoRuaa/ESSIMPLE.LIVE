import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Clipboard } from '@capacitor/clipboard';

export type PermissionName =
  | 'sms'
  | 'calls'
  | 'location'
  | 'backgroundLocation'
  | 'microphone'
  | 'notifications';

export interface NativeStatus {
  sms: boolean;
  calls: boolean;
  location: boolean;
  backgroundLocation: boolean;
  microphone: boolean;
  notifications: boolean;
  batteryUnrestricted: boolean;
  fullScreenAlerts: boolean;
  homeLauncher: boolean;
  deviceOwner: boolean;
  kiosk: boolean;
  homeReleased: boolean;
}

interface SimplePlugin {
  requestPermission(opts: { name: PermissionName }): Promise<{ granted: boolean }>;
  getStatus(): Promise<NativeStatus>;
  requestBatteryUnrestricted(): Promise<{ granted: boolean }>;
  requestFullScreenAlerts(): Promise<{ granted: boolean }>;
  requestHomeLauncher(): Promise<{ granted: boolean }>;
  openAppSettings(): Promise<void>;
  openSystemSettings(): Promise<void>;
  callDirect(opts: { number: string }): Promise<{ granted: boolean }>;
  sendSms(opts: { number: string; text: string }): Promise<{ granted: boolean }>;
  enterKiosk(): Promise<{ level: 'basic' | 'launcher' | 'owner' }>;
  exitKiosk(): Promise<void>;
  minimize(): Promise<void>;
  releaseHome(): Promise<{ released: boolean }>;
  restoreHome(): Promise<{ wasDefaultHome: boolean }>;
}

const Simple = registerPlugin<SimplePlugin>('Simple');

/** true cuando corre dentro del APK de Android; false en el navegador (panel familiar o vista previa). */
export const isNative = (): boolean => Capacitor.isNativePlatform();

export const requestPermission = async (name: PermissionName): Promise<boolean> => {
  if (!isNative()) return true;
  try {
    return (await Simple.requestPermission({ name })).granted;
  } catch {
    return false;
  }
};

export const getNativeStatus = async (): Promise<NativeStatus | null> => {
  if (!isNative()) return null;
  try {
    return await Simple.getStatus();
  } catch {
    return null;
  }
};

const safeBool = async (fn: () => Promise<{ granted: boolean }>): Promise<boolean> => {
  if (!isNative()) return true;
  try {
    return (await fn()).granted;
  } catch {
    return false;
  }
};

export const requestBatteryUnrestricted = () => safeBool(() => Simple.requestBatteryUnrestricted());
export const requestFullScreenAlerts = () => safeBool(() => Simple.requestFullScreenAlerts());
export const requestHomeLauncher = () => safeBool(() => Simple.requestHomeLauncher());

export const openAppSettings = async (): Promise<void> => {
  if (isNative()) await Simple.openAppSettings().catch(() => {});
};

export const openSystemSettings = async (): Promise<void> => {
  if (isNative()) await Simple.openSystemSettings().catch(() => {});
};

/** Llamada directa (sin pasar por el marcador) en Android; en web cae a tel:. */
export const callNumber = async (number: string): Promise<void> => {
  const clean = number.replace(/[^\d+*#]/g, '');
  if (!clean) return;
  if (isNative()) {
    try {
      await Simple.callDirect({ number: clean });
      return;
    } catch {
      // cae al enlace tel:
    }
  }
  window.location.href = `tel:${clean}`;
};

/** SMS directo en Android. Devuelve false si no se pudo enviar (web o sin permiso). */
export const sendSmsNative = async (number: string, text: string): Promise<boolean> => {
  if (!isNative()) return false;
  try {
    return (await Simple.sendSms({ number, text })).granted;
  } catch {
    return false;
  }
};

export const enterKiosk = async (): Promise<'basic' | 'launcher' | 'owner' | null> => {
  if (!isNative()) return null;
  try {
    return (await Simple.enterKiosk()).level;
  } catch {
    return null;
  }
};

export const exitKiosk = async (): Promise<void> => {
  if (isNative()) await Simple.exitKiosk().catch(() => {});
};

/** Suelta la pantalla de inicio y el kiosco: el celular vuelve a su estado normal. Los permisos no se tocan. */
export const releaseHome = async (): Promise<boolean> => {
  if (!isNative()) return true;
  try {
    return (await Simple.releaseHome()).released;
  } catch {
    return false;
  }
};

/** Vuelve a activar Simple como pantalla de inicio. Devuelve si lo era antes de soltarla. */
export const restoreHome = async (): Promise<boolean> => {
  if (!isNative()) return false;
  try {
    return (await Simple.restoreHome()).wasDefaultHome;
  } catch {
    return false;
  }
};

/** Se llama cada vez que la app vuelve a primer plano. Devuelve la función para quitar el listener. */
export const onAppResume = (handler: () => void): (() => void) => {
  if (!isNative()) return () => {};
  const handle = CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) handler();
  });
  return () => {
    handle.then(h => h.remove()).catch(() => {});
  };
};

export const minimizeApp = async (): Promise<void> => {
  if (isNative()) await Simple.minimize().catch(() => {});
};

/** Captura el botón Atrás de Android para que nunca cierre la app. Devuelve la función para quitar el listener. */
export const onBackButton = (handler: () => void): (() => void) => {
  if (!isNative()) return () => {};
  const handle = CapApp.addListener('backButton', handler);
  return () => {
    handle.then(h => h.remove()).catch(() => {});
  };
};

export const readClipboardText = async (): Promise<string> => {
  try {
    if (isNative()) {
      const { value } = await Clipboard.read();
      return value || '';
    }
    return (await navigator.clipboard.readText()) || '';
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// Vinculación: código "SIMPLE-<base64url(email)>" que viaja junto al link del APK
// ---------------------------------------------------------------------------

const PAIR_PREFIX = 'SIMPLE-';
export const PAIR_STORAGE_KEY = 'essimple_pair_family';

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): string => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const buildPairCode = (familyEmail: string): string => PAIR_PREFIX + toBase64Url(familyEmail.trim().toLowerCase());

/** Busca un código de vinculación dentro de un texto (por ejemplo, el mensaje de WhatsApp copiado). */
export const parsePairCode = (text: string): string | null => {
  const match = text.match(/SIMPLE-([A-Za-z0-9_-]{6,})/);
  if (!match) return null;
  try {
    const email = fromBase64Url(match[1]);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
};

export const getPairedFamily = (): string | null => {
  try {
    return localStorage.getItem(PAIR_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const savePairedFamily = (email: string): void => {
  try {
    localStorage.setItem(PAIR_STORAGE_KEY, email);
  } catch {
    // ignorar
  }
};

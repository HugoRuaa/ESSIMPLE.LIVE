// Consentimiento de almacenamiento/cookies. Categoría única: estadísticas (Google Analytics).
// La preferencia misma es almacenamiento estrictamente necesario y no requiere consentimiento.

export interface Consent {
  analytics: boolean;
  version: number;
  decidedAt: string;
}

export const CONSENT_VERSION = 1;
const STORAGE_KEY = 'es_consent_v1';
const CHANGE_EVENT = 'es:consent-change';
export const OPEN_EVENT = 'es:open-consent';

// ID de medición de Google Analytics 4 (formato G-XXXXXXXXXX) de essimple.live.
// PENDIENTE: pegarlo aquí antes de publicar. Mientras esté vacío, no se carga nada y no se muestra el banner.
const GA_ID = '';

export const ANALYTICS_ENABLED = GA_ID !== '';

/**
 * Las estadísticas solo corren en la web pública (portada, panel y páginas legales).
 * Nunca en el APK, en la pantalla de la persona acompañada ni en los enlaces que llevan datos
 * en la dirección (/d/<código>, /avisos/<familia>/<teléfono>, ?token=...).
 */
export function analyticsAllowedHere(): boolean {
  if (!ANALYTICS_ENABLED || typeof window === 'undefined') return false;
  try {
    if ((window as any).Capacitor?.isNativePlatform?.()) return false;
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    if (
      path.startsWith('/d/') ||
      path.startsWith('/avisos/') ||
      path.startsWith('/instalar') ||
      path.startsWith('/acompanado') ||
      path === '/telefono' ||
      search.has('token') ||
      search.get('view') === 'phone' ||
      search.get('mode') === 'phone' ||
      localStorage.getItem('essimple_is_phone_device') === 'true'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Consent;
    if (p.version !== CONSENT_VERSION) return null;
    return { analytics: !!p.analytics, version: p.version, decidedAt: p.decidedAt };
  } catch {
    return null;
  }
}

function deleteGoogleCookies() {
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const domains = new Set<string>([host, '.' + host]);
    if (parts.length > 2) domains.add('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (/^(_ga|_gid|_gat)/.test(name)) {
        domains.forEach((d) => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
        });
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  } catch {
    /* sin acceso a cookies */
  }
}

export function saveConsent(next: { analytics: boolean }): void {
  const previous = readConsent();
  const consent: Consent = { analytics: next.analytics, version: CONSENT_VERSION, decidedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* sin almacenamiento: vale solo para esta carga */
  }
  if (GA_ID && !next.analytics) (window as any)[`ga-disable-${GA_ID}`] = true;
  if (previous?.analytics && !next.analytics) {
    deleteGoogleCookies();
    window.location.reload();
    return;
  }
  loadThirdParties(consent);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: consent }));
}

export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

let gaLoaded = false;

export function loadThirdParties(consent: Consent | null): void {
  if (!GA_ID || !analyticsAllowedHere()) return;
  if (!consent || !consent.analytics || gaLoaded) return;
  gaLoaded = true;
  const w = window as any;
  w[`ga-disable-${GA_ID}`] = false;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  w.gtag('js', new Date());
  w.gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

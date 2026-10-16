/** Dirección pública del sitio: lo que se comparte con la persona acompañada. */
export const siteOrigin = (): string => {
  const o = typeof window !== 'undefined' ? window.location.origin : '';
  return o && !/localhost|127\.0\.0\.1|capacitor/.test(o) ? o : 'https://essimple.live';
};

/** Enlace que se envía: abre la página de descarga del APK. No lleva datos de la familia. */
export const buildInstallLink = (suffix = 'apk'): string => `${siteOrigin()}/d/${suffix}`;

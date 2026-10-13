/**
 * Enlace de descarga directa del APK de Simple.
 * Por defecto apunta al APK que publica el workflow de GitHub Actions (.github/workflows/build-apk.yml).
 * Se puede cambiar con VITE_APK_URL (por ejemplo, un bucket público de Supabase Storage).
 */
export const APK_URL: string =
  (import.meta.env?.VITE_APK_URL as string | undefined) ||
  'https://github.com/HugoRuaa/essimple.live/releases/download/apk/simple.apk';

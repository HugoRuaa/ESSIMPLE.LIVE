# essimple.live para Android (APK)

La vista del acompañado es ahora una app Android (Capacitor) que empaqueta esta misma web. No necesita servidor propio:
habla directo con Supabase y el APK se compila en GitHub Actions.

## Cómo llega el APK al teléfono
1. Haz push a `main` (o ejecuta "Build APK" a mano en la pestaña Actions).
2. El workflow publica `essimple.apk` en el release `apk`:
   `https://github.com/HugoRuaa/essimple.live/releases/download/apk/essimple.apk`
3. En el panel familiar → Ajustes → "Enlace de descarga del APK" comparte el enlace (WhatsApp, QR o copiar).
   El mensaje incluye el código de vinculación `SIMPLE-...`.

> Un repositorio privado no permite descargar los releases sin iniciar sesión. Opciones: hacer público el repo, o
> crear un bucket **público** `apk` en Supabase Storage y añadir el secreto `SUPABASE_SERVICE_KEY`; el workflow sube
> allí el APK y puedes fijar la variable `APK_URL` a `https://<proyecto>.supabase.co/storage/v1/object/public/apk/essimple.apk`.

## Secretos y variables (Settings → Secrets and variables → Actions)
| Nombre | Para qué |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Conexión a Supabase dentro del APK. Usa la llave **anon/publishable**, nunca una `service_role` / `sb_secret_`. |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD` | Firma con tu llave (recomendado: así las actualizaciones se instalan encima). El alias se detecta solo desde el keystore y se asume la misma contraseña para la llave; si no es así, añade el secreto `ANDROID_KEY_PASSWORD` y/o la variable `ANDROID_KEY_ALIAS`. Sin esto se firma con la llave de depuración. |
| `SUPABASE_SERVICE_KEY` (opcional) | Sube también el APK a Supabase Storage. |
| `APK_URL` (variable, opcional) | Enlace de descarga que muestra el panel si no usas el release de GitHub. |

## Niveles de "difícil de salir"
- **Básico (siempre):** pantalla completa sin barras, pantalla siempre encendida, el botón Atrás no cierra la app, salir pide el PIN.
- **Pantalla de inicio:** el asistente pide elegir essimple.live como launcher; el botón Inicio vuelve siempre a essimple.live.
- **Salir con PIN:** después del PIN solo hay dos botones: *Volver a la app* o *Volver al estado normal del celular*. El segundo suelta la pantalla de inicio y el kiosco (los permisos se conservan). Al abrir essimple.live otra vez vuelve a ser la pantalla de inicio; Android pide un toque de confirmación para ello (salvo con propietario del dispositivo). El menú de mantenimiento completo sigue disponible con una pulsación larga sobre el título de la pantalla del PIN.
- **Propietario del dispositivo (máximo):** con el teléfono recién reiniciado de fábrica y sin cuentas:
  `adb shell dpm set-device-owner live.essimple/.SimpleAdminReceiver`
  Concede los permisos sin diálogos y fija la tarea (con el marcador permitido para llamar).

## Desarrollo
```
npm run build && npx cap sync android   # copia la web al proyecto Android
npx cap open android                    # abrir en Android Studio
```

# APP PROFILE — essimple.live

> Esquema: `APP_BLUEPRINT.md` · Procedimiento: `GUIA_REPLICAR.md`.
> Última auditoría: **16 de octubre de 2026** · Commit base auditado: `c5fcf54` · Blueprint: **v1**
> Estado: capa legal en la rama `feat/capa-legal` (NO está en `main`). Solo se tocó lo legal; ninguna función ni dato cambió, salvo la casilla de aceptación del registro (ahora desmarcada y con enlaces).

## 1. Identidad (M01)

| Campo | Valor |
|---|---|
| Dominio | https://essimple.live |
| Propósito | Teléfono Android adaptado (contactos grandes, SOS, Dónde estoy) para una persona mayor o con limitaciones cognitivas/visuales + panel web familiar |
| Stack | React + Vite + Tailwind 4 · Supabase (esquema `essimple`, sin Supabase Auth) · Edge Function `enviar-avisos` (web-push) · Capacitor Android · hosting estático (`.htaccess`, Hostinger) · `server.ts` solo de desarrollo (no verificado si corre en producción) |
| Responsable legal | **INSIGHT PROVIDERS S.A.S.**, NIT 901796424, Cámara de Comercio de Medellín para Antioquia |
| Contacto | consultas@insightproviders.cc (`SITE.contactEmail` en `src/legal/content.ts`) |

**Clase de dato: D** (ubicación; datos de una persona vulnerable registrados por un tercero; teléfonos y fotos de terceros).

## 2. Calibres

| Módulo | Antes | Ahora | Objetivo |
|---|---|---|---|
| M04 Legal | 0 | 2 (3 tras revisión jurídica) | 3 |
| M05 Analítica | 0 (sin analítica) | 2 en cuanto se pegue `GA_ID` (GA4 solo con consentimiento) | 2 |
| M07 Seguridad | — | **sin tocar, crítico** (ver deuda) | 3 |
| Resto | — | sin evaluar a fondo | — |

## 3. Inventario de datos (lo que el código hace hoy)

| Dato | Dónde | Terceros | ¿Lo dice la política? |
|---|---|---|---|
| Correo, contraseña (hash SHA-256 enviado desde el cliente), PIN de salida **en claro**, nombre del acompañado, tamaño de letra, código de país, mensajes rápidos | `essimple.familias` | Supabase | Sí (sin detallar el método de protección, a propósito) |
| Contactos (nombre, teléfono, foto, color, marcas) | `essimple.contactos` | Supabase | Sí |
| Casa y zona segura (dirección, coordenadas, radio) | `essimple.casa_zona` | Supabase | Sí |
| Estado del teléfono y última ubicación (una fila por familia) | `essimple.estado_telefono`, `TrackingService` cada ≤5 min | Supabase | Sí |
| Eventos y cambios (últimos 50 de cada uno; incluye el **texto** de SMS/WhatsApp enviados) | `essimple.eventos`, `essimple.cambios` | Supabase | Sí |
| Suscripción push y teléfono del contacto | `essimple.push_suscripciones` | Supabase, push de Google/Apple/Mozilla | Sí |
| Correo de la familia + **IP** de quien descarga | `essimple.vinculos_pendientes` (se purga a los 2 días al registrarse otra descarga) | Supabase | Sí |
| Audio de notas de voz | Solo en el dispositivo (caché) y WhatsApp; la tabla `mensajes_voz` y `/api/share/audio` existen pero la interfaz no los usa | WhatsApp | Sí (no se almacena) |
| Datos de sesión y familia en `localStorage` (`essimple_*`, incluye `essimple_password`) | Dispositivo | — | Sí (de forma general) |
| Preferencia `es_consent_v1` | `localStorage` | — | Sí |
| GA4 | Solo tras aceptar y solo en web pública (`src/consent.ts`). **`GA_ID` vacío: pendiente** | Google | Sí |
| Google Fonts, Leaflet CSS (unpkg), teselas OpenStreetMap, Nominatim, fotos Unsplash (portada/demo), `nosunimos.live/embed.js` | Navegador | Google, unpkg, OSM, Unsplash, nosunimos.live | Sí |
| `ip-api.com` (ubicación aproximada por IP, **solo si corre `server.ts`**) | Servidor | ip-api.com | Sí (condicional). **No verificado** si está activo |
| Carga del código más reciente desde essimple.live (`live.json`) | APK | — | Sí |

## 4. Qué ofrece / qué no
- **Ofrece:** teléfono sencillo, SOS que llama al primer contacto y avisa por notificación, Dónde estoy, zona segura, batería, última ubicación, notas de voz y mensajes por WhatsApp/SMS, kiosco.
- **No ofrece:** servicio médico ni de emergencias, llamada automática al 123, detección de caídas, garantía de alarmas. Los avisos automáticos son notificaciones push; el código de `TrackingService` para enviar SMS automáticos existe pero no se invoca.
- **Documentos (5):** `/acerca`, `/privacidad`, `/terminos`, `/aviso-importante`, `/contacto`. Aceptación con enlaces en el registro y en "Antes de empezar".

## 5. Deuda
### P0 abiertos (decisión de Hugo pendiente: ¿se corrigen antes de publicar? — pregunta 1 sin responder)
1. **RLS abierto:** todas las tablas de `essimple` tienen política `using (true)` para `anon`. Con la llave pública (va en la web y en el APK) se puede leer y modificar todo: correo, hash, PIN, contactos, casa, ubicación.
2. **Contraseña:** se guarda en claro en `localStorage` (`essimple_password`); `server.ts` tiene `GET /api/familias/:id/password` que la devuelve y datos por defecto con correo y claves reales. El hash SHA-256 es sin sal. El login aún acepta comparación con texto plano.
3. **PIN de salida en claro** en `familias.exit_pin`.
4. `resolveCurrentFamilyId()` cae a `'hugofrua@gmail.com'` cuando no hay sesión: escribe eventos/cambios en esa familia.
5. **Función `enviar-avisos`:** el disparador SQL lleva el secreto en el script (`PEGAR_AQUI_EL_SECRETO`); revisar que no quede en el repo.
6. **Sin borrado de cuenta** en la interfaz (la política dice "por solicitud al correo").

### P1/P2
- Revisar `ip-api.com` (http sin cifrar) y si producción corre `server.ts`.
- Leer qué hace `nosunimos.live/embed.js` (cookies, datos).
- Revisión jurídica (Ley 1581): autorización de personas con limitaciones cognitivas, finalidades, retención, RNBD.
- Pegar `GA_ID` en `src/consent.ts` y comprobar que el banner aparece y que GA no carga en `/d/`, `/avisos/`, APK ni vista del teléfono.
- Comprobar qué muestra el APK al abrir `/privacidad` sin conexión.
- Enlaces legales dentro de la sesión iniciada del panel (hoy solo en portada, registro y páginas legales).

## 6. Decisiones (Hugo)
Responsable = INSIGHT PROVIDERS S.A.S.; mismos contactos que CareFor; mismo esquema (2026-10-16). Habrá Google Analytics. Aceptación como en CareFor. Retención: cuenta mientras exista, 50 eventos/cambios, IP 2 días, borrado por solicitud. Texto sobre autorización del representante legal con revisión de Hugo.

## 7. Bitácora
| Fecha | Cambio | Módulos | Calibre |
|---|---|---|---|
| 2026-10-16 | Primera auditoría; capa legal (5 docs), consentimiento GA4 (inactivo hasta `GA_ID`), enlaces en portada y registro, casilla desmarcada con enlaces y declaración de autorización, `sitemap.xml`, `robots.txt` | M04, M05 | M04 0→2 |

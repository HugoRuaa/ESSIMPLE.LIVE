# APP PROFILE — essimple.live

> Esquema: `APP_BLUEPRINT.md` · Procedimiento: `GUIA_REPLICAR.md`.
> Última auditoría: **16 de octubre de 2026** · Commit base auditado: `c5fcf54` · Blueprint: **v1**
> Estado: capa legal y seguridad (fases 0, 2 y 4 en código; SQL fase 1 + parches 1 y 2 ya corridos por Hugo en Supabase) fusionadas en `main` el 2026-10-16 (`bc886ac`); la compilación del APK en GitHub Actions terminó bien. Fase 0 de seguridad hecha en código; el SQL de la fase 1 está escrito y probado en una base local, **NO ejecutado en Supabase**.

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
| M07 Seguridad | — | **1**: fase 0 hecha; RLS sigue abierto en producción hasta ejecutar `supabase-seguridad.sql` y publicar el cliente nuevo | 3 |
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
### P0 abiertos (Hugo decidió corregir con corte limpio: 10 familias, sin recuperación de clave, Supabase Auth con correo y clave sin confirmación)
1. **RLS abierto:** todas las tablas de `essimple` tienen política `using (true)` para `anon`. Con la llave pública (va en la web y en el APK) se puede leer y modificar todo: correo, hash, PIN, contactos, casa, ubicación.
2. **Contraseña (fase 0 HECHA en código: ya no se guarda ni se muestra, se borra de los dispositivos, endpoints eliminados; falta Supabase Auth, fase 2):** se guarda en claro en `localStorage` (`essimple_password`); `server.ts` tiene `GET /api/familias/:id/password` que la devuelve y datos por defecto con correo y claves reales. El hash SHA-256 es sin sal. El login aún acepta comparación con texto plano.
3. **PIN de salida en claro** en `familias.exit_pin`.
4. **(HECHO en código)** antes `resolveCurrentFamilyId()` caía a `'hugofrua@gmail.com'` cuando no hay sesión: escribe eventos/cambios en esa familia.
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

## 6b. Plan de seguridad (rama `fix/seguridad`)
- Fase 0 (hecha): sin contraseña en cliente, sin correo del dueño como respaldo, `server.ts` sin endpoints de clave ni tokens fijos.
- Fase 1 (escrita, no ejecutada): `supabase-seguridad.sql`: RLS por dueño (`owner_id = auth.uid()`), tablas cerradas a `anon`, teléfono con código de un solo uso (15 min) y token con hash, funciones `dispositivo_*`, PIN con hash y bloqueo tras 5 fallos, recorte a 50 eventos/cambios, `eliminar_mi_cuenta()`. Probada en PostgreSQL 16 local con `auth` simulado (aislamiento entre familias, anon sin acceso, vinculación, PIN, límite de intentos, borrado). **No probada contra Supabase real.**
- Fase 2 (hecha en código, sin probar contra Supabase real): Supabase Auth (correo y clave ≥10; sin confirmación ni recuperación), alta con `crear_mi_familia`, cambiar PIN y borrar cuenta, vínculo del teléfono por código (8 caracteres, 15 min, un uso), `dataService` sin rutas `/api` ni acceso directo a tablas del teléfono.
- PIN del teléfono: se comprueba en el teléfono contra el hash bcrypt que entrega el servidor (funciona sin señal); bloqueo local de 15 min tras 5 fallos. Un PIN nuevo llega al teléfono la próxima vez que se conecte. Límite honesto: quien extraiga los datos de la app puede probar los 10.000 PIN; es una traba, no una defensa.
- Fase 3 (hecha en código en `fix/seguridad`, SQL `supabase-seguridad-fase3.sql` probado en local y NO ejecutado; el cliente no está en `main` hasta que Hugo lo ejecute): enlace `/avisos/<token>` por contacto (hash en `avisos_enlaces`), `push_suscripciones` cerrada, revocación al borrar contacto o cambiar su número; el guardado de contactos ahora actualiza por id en vez de borrar todo. Vínculo viejo por correo+IP: se elimina con la limpieza. Pendiente de verificar en real: el disparador `avisar_evento` y la función `enviar-avisos` (secreto, VAPID).
- Fase 4 (hecha en código, sin compilar el APK): `TrackingService` usa `rpc/dispositivo_reportar` y `rpc/dispositivo_evento` con el token. Falta compilar e instalar el APK nuevo en los 10 teléfonos.
- SQL: `supabase-seguridad.sql` (+ `parche1`, `parche2` para quien ya corrió la versión inicial) y `supabase-seguridad-limpieza.sql` (destructivo: borra familias viejas y quita `password_hash` y `exit_pin`; correr con el cliente nuevo publicado).
- Al terminar: reescribir secciones 4 y 11 de la política y avisar a las 10 familias (claves nuevas puestas por Hugo; clave olvidada = Hugo la cambia a mano).
- Sin verificar: `android/.../assets/public/assets/app-entry-*.js` está versionado y contiene código viejo; no sé si el CI lo regenera. El disparador `avisar_evento` (pg_net) con inserciones desde RPC. Configuración real de Auth en Supabase.

## 7. Bitácora
| Fecha | Cambio | Módulos | Calibre |
|---|---|---|---|
| 2026-10-16 | Primera auditoría; capa legal (5 docs), consentimiento GA4 (inactivo hasta `GA_ID`), enlaces en portada y registro, casilla desmarcada con enlaces y declaración de autorización, `sitemap.xml`, `robots.txt` | M04, M05 | M04 0→2 |
| 2026-10-16 | Fase 0 de seguridad (código) + `supabase-seguridad.sql` (fase 1, no ejecutado) | M07 | M07 →1 |
| 2026-10-16 | Fusión a `main`; textos legales al día con la seguridad; pendiente: prueba real en el sitio, limpieza SQL, reinstalar APK en 10 teléfonos, fase 3 (avisos a contactos) | M04, M07 | M07 1 |
| 2026-10-16 | Todo el SQL ejecutado por Hugo sin errores (fase 1, parches 1 y 2, limpieza, fase 3); fases 3 y 4 en `main`; Ajustes: cambiar contraseña (nueva + repetirla, sin pedir la actual; sesión abierta = titular). Pendiente real: avisos (`avisar_evento`, `enviar-avisos`), APK en teléfono, GA4 ID, revisión legal de Hugo | M07 | M07 1 |

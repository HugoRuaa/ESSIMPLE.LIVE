# GUÍA PARA REPLICAR EL ESQUEMA EN OTRA APP

Sirve para alinear cualquiera de mis apps con el mismo esquema, en otra conversación o con otra sesión de Claude.
Referencia viva: **MultasPagas.com** (repo `HugoRuaa/MULTASPAGAS.COM`, rama `fix/privacidad-p0`).

## 0. Qué lleva cada repo

| Archivo | Qué es | Igual en todas |
|---|---|---|
| `APP_BLUEPRINT.md` | Esquema: 12 módulos, clases de dato A–D, calibres 0–3, auditoría | Sí |
| `GUIA_REPLICAR.md` | Este archivo: procedimiento y prompt | Sí |
| `APP_PROFILE.md` | Ficha única de la app (se parte de `APP_PROFILE.template.md`) | No |
| `CLAUDE.md` | Le dice a Claude que lea lo anterior al abrir la app | Sí |

**Claude no recuerda otras conversaciones.** Estos archivos son la memoria: si están en el repo, cualquier sesión arranca sabiendo cómo está la app.

## 1. Prompt para pegar al empezar (copiar tal cual)

```
Voy a alinear esta app con mi esquema común de apps. Lee APP_BLUEPRINT.md y GUIA_REPLICAR.md.
Si no están en el repo, te los adjunto en este mensaje.

Haz esto, en orden:
1. Audita el código real (no supongas): qué guarda, qué terceros carga, qué endpoints
   quedan abiertos, qué secretos hay en el repo. Clasifica la app en clase A–D.
2. Crea APP_PROFILE.md desde APP_PROFILE.template.md con calibres, inventario de datos y deuda P0/P1/P2.
3. Antes de cambiar nada, hazme UNA sola ronda de preguntas con las decisiones abiertas
   (responsable legal, correo de contacto, monetización, qué datos guardar) y propón un valor por
   defecto para cada una.
4. Trabaja en una rama nueva (nunca en main). Aplica la Fase 2 a la 6 de GUIA_REPLICAR.md,
   adaptando a lo que ESTA app realmente ofrece.
5. Verifica: typecheck, build y pruebas reales (curl a los endpoints, PDFs generados).
6. Entrégame: commit en la rama, lista de variables de entorno que debo configurar ANTES de
   desplegar, y qué verificaste y qué no pudiste verificar.

Reglas: la política debe decir solo lo que el código hace; no inventes datos legales (NIT,
dirección); si algo de un tercero no lo has leído, dilo en vez de asumirlo; usa el tono de
sitio informativo si la app no es un servicio oficial.
```

## 2. Procedimiento (las 8 fases que seguimos en MultasPagas)

### Fase 1 · Auditoría (≈10 min)
Comandos útiles:
```
git ls-files | head -200
grep -rn "localStorage\|sessionStorage\|writeFile\|\.push(\|INSERT" src server
grep -n "googletagmanager\|adsbygoogle\|<script" index.html
grep -rn "key\|secret\|token\|password" --include=*.ts --include=*.tsx --include=.env*
```
Entregable: clase de dato (A–D), tabla de calibres y inventario de datos en `APP_PROFILE.md`.
**Criterio de éxito:** cada fila del inventario dice si la política actual lo menciona y si es verdad.

### Fase 2 · Corregir contradicciones entre texto y código (P0)
- Si la app guarda un dato que la política dice que no guarda → dejar de guardarlo (preferido) o declararlo.
- Endpoints de administración/estadísticas → token en servidor (`ADMIN_TOKEN`); sin token configurado, cerrados.
- IP u otros identificadores → HMAC con clave secreta y fecha, nunca hash simple; no guardar en claro.
- Retención declarada y aplicada (borrado automático; en MultasPagas, 90 días) y limpieza de datos heredados.
- Consentimiento: Analytics, anuncios e identificadores de sesión solo se cargan tras aceptar (`src/consent.ts` + `ConsentBanner.tsx`).

### Fase 3 · Legal como datos
- Un solo archivo de contenido: `src/legal/content.ts` (versión, fecha, responsable, documentos).
- Páginas HTML con URL propia: `/acerca`, `/privacidad`, `/terminos`, `/contacto`, `/legal` (índice).
- Enlaces en el pie, rutas en el servidor y en `sitemap.xml`.
- Los PDF salen del mismo contenido (`generateLegalPDF`).
- Una sola fecha y versión para todos los documentos.

### Fase 4 · Ajustar el texto a lo que la app ofrece
- Sección "Qué ofrece / Qué no ofrece" en Acerca de.
- Datos: qué se trata, para qué, base de autorización, retención, terceros, transferencias.
- Habeas Data (Ley 1581 de 2012), mínimos: responsable identificado, finalidades, derechos del titular, procedimiento y plazos (consultas 10 días hábiles +5; reclamos 15 +8), queja ante la SIC.
- Términos: objeto, independencia, origen de datos, uso permitido, no es asesoría, gratuidad/publicidad, propiedad intelectual, responsabilidad, cambios y ley aplicable.
- Quitar promesas no verificables ("firewalls rigurosos", "auditorías continuas").
- No inventar NIT ni dirección: si no existen aún, decir que se publicarán al concluir la constitución.

### Fase 5 · Servidor
- Límite de frecuencia por IP (`createRateLimiter`), con `TRUST_PROXY` ajustable.
- Cabeceras de seguridad en producción (nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy, HSTS).
- Errores genéricos al cliente; el detalle solo al log del servidor.
- Entradas acotadas (`clip`), cuerpo JSON ≤ 10 kb.
- Diagnósticos (`/api/config-status`) solo con token de admin.
- Secretos solo desde el entorno, sin valores por defecto en el código; `.env.example` con marcadores.

### Fase 6 · Tono y verificación de fuentes
- Si la app no es oficial, que no lo parezca (nada de "boletín oficial" propio; atribuir a la fuente).
- Cualquier cifra o afirmación externa se contrasta con la fuente antes de publicarla.
- Los terceros que se cargan se leen antes de afirmar qué hacen (cookies, datos): no se asume.

### Fase 7 · Verificación
- `npx tsc --noEmit` y `npm run build`.
- Arrancar el servidor compilado y probar con `curl`: 401 sin token, 200 con token, 429 al superar el límite, 404 en rutas inexistentes, rutas legales 200, cabeceras presentes, sitemap con las URLs.
- Generar los PDF y revisar páginas y texto (`pdfinfo`, `pdftotext`).
- Comprobar que el log no contiene datos que no debería.

### Fase 8 · Entrega
- Rama `fix/...`, commits con mensaje claro, push, pull request.
- Lista de **variables de entorno a configurar antes de desplegar** (si faltan, la app puede dejar de funcionar).
- Actualizar `APP_PROFILE.md` (calibres, deuda, bitácora).
- Dejar claro qué NO se pudo verificar (por ejemplo, permisos de la base de datos).

## 3. Archivos de referencia (copiar y adaptar desde MultasPagas)

| Archivo | Qué hace | Adaptar |
|---|---|---|
| `src/legal/content.ts` | Contenido legal único, `SITE`, `LEGAL_VERSION` | **Todo el texto**, responsable, correo, URL |
| `src/legal/LegalPage.tsx` | Renderiza cualquier documento en HTML con SEO | Colores/estilos |
| `src/utils/pdfGenerator.ts` | PDF desde el mismo contenido | Cabecera/pie, colores |
| `src/consent.ts` | Lógica de consentimiento y carga de terceros | IDs de GA/AdSense, categorías |
| `src/components/ConsentBanner.tsx` | Banner Aceptar/Rechazar/Elegir | Texto y estilo |
| `server.ts` (partes) | `requireAdmin`, `hashIp`, `createRateLimiter`, cabeceras, `clip` | Rutas y límites de la app |
| `server/analyticsStore.ts` | Registro con retención y limpieza | Solo si la app tiene analítica propia |
| `.env.example` | Variables: `ADMIN_TOKEN`, `IP_HASH_SECRET`, límites, `TRUST_PROXY` | Nombres de servicios propios |

Para traerlos a una app nueva: pedirle a Claude que añada el repo `HugoRuaa/MULTASPAGAS.COM` y lea esos archivos en la rama `fix/privacidad-p0`.

## 4. Qué cambia según el tipo de app

| Caso | Qué hacer distinto |
|---|---|
| Clase A (sin datos personales, estático) | Solo Fase 3–4 reducidas (Acerca, Términos, Contacto); sin banner si no hay terceros |
| Sin servidor propio (sitio estático / solo frontend) | Omitir Fase 5; el consentimiento y las páginas legales se hacen igual; secretos fuera del código igualmente |
| Sin anuncios | Quitar la categoría "Publicidad" del banner y de la política |
| Sin analítica | Quitar "Estadísticas"; si solo hay herramientas esenciales, no hace falta banner |
| Con cuentas de usuario / pagos (clase C–D) | Subir calibre: base de autorización explícita, política de datos más extensa, canal de derechos con responsable identificado, evaluar con abogado |
| Datos de terceros o sensibles (clase D) | No guardar el dato sensible, registrar solo agregados, panel admin protegido, retención corta |
| Otra jurisdicción distinta a Colombia | Cambiar la base legal (Ley 1581 → norma local) antes de copiar el texto |

## 5. Decisiones que debo tener a mano antes de empezar

- Responsable legal: nombre o razón social, NIT, domicilio (o "en constitución").
- Correo de contacto para derechos y soporte.
- ¿Tiene monetización (anuncios, aportes, pagos)?
- ¿Qué datos recoge de verdad (revisar el inventario antes de decidir)?
- ¿Dónde se despliega y cómo se configuran las variables de entorno?
- ¿Usa terceros con scripts propios (analítica, anuncios, widgets)?

## 6. Trampas que ya encontramos

1. La política decía "no guardamos placas" y el código las guardaba: **siempre contrastar texto y código**.
2. Un endpoint de estadísticas abierto devolvía datos de consultas: revisar todos los `/api/*`.
3. Un hash de IP de 32 bits no protege nada: usar HMAC con clave secreta.
4. Analytics y anuncios cargaban sin permiso: moverlos detrás del consentimiento.
5. No asumir que un tercero usa cookies (o que no): **leer su script**.
6. Quitar claves por defecto del código puede dejar la app sin funcionar si el hosting no las tiene: configurarlas antes de desplegar.
7. Detrás de un proxy, el límite por IP puede contar a todos como uno: ajustar `TRUST_PROXY`.
8. Un clon superficial puede no tener la referencia remota de la rama: registrarla o usar `git ls-remote` para verificar el push.
9. Las cifras de noticias o comunicados se contrastan con la fuente: el matiz importa (en este caso, comparendos *aún no pagados*).
10. Una sola fecha/versión para todos los documentos legales.

## 7. Mantener las seis apps sincronizadas

Cuando se mejore algo en una app:
1. Actualizar `APP_BLUEPRINT.md` o `GUIA_REPLICAR.md` (subir versión abajo).
2. Copiarlos a las demás apps.
3. Anotar en el `APP_PROFILE.md` de cada una qué versión del blueprint usa.

| App | Versión del blueprint | Última auditoría | Clase |
|---|---|---|---|
| MultasPagas | v1 | 2026-10-07 | D |
| App 2 | | | |
| App 3 | | | |
| App 4 | | | |
| App 5 | | | |
| App 6 | | | |

---
*Guía v1 · octubre de 2026. Es una guía técnica, no asesoría jurídica; los textos legales finales conviene revisarlos con un abogado.*

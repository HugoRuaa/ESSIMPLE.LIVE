# APP BLUEPRINT v1 — esquema común para todas mis apps

> Este archivo es **idéntico en las 6 apps**. No se edita por app.
> Lo que hace distinta a cada app vive en `APP_PROFILE.md`.
> Cada app tiene los mismos 12 módulos; cambia el **calibre** (0–3) de cada uno.

## 0. Cómo se usa

Cada repo lleva 3 archivos en la raíz:

| Archivo | Qué es | ¿Se edita? |
|---|---|---|
| `APP_BLUEPRINT.md` | El esquema (este archivo) | Solo cuando mejore el esquema; se copia a las 6 |
| `GUIA_REPLICAR.md` | Procedimiento en 8 fases + prompt para pegar en otra app o conversación | Igual en las 6 |
| `APP_PROFILE.md` | Ficha de la app (se parte de `APP_PROFILE.template.md`): clase de dato, calibre de cada módulo, inventario de datos, deuda | Sí, cada vez que cambie algo |
| `CLAUDE.md` | Le dice a Claude que lea los dos anteriores al abrir la app | Casi nunca |

Flujo para ajustar una app: **abrir → leer el profile → correr la auditoría (§7) → subir calibre donde falte → actualizar el profile.**

## 1. Principios

1. **Una sola verdad.** Lo que la app recolecta se declara una vez (inventario de datos, §6). Política de privacidad, aviso de cookies y panel admin salen de ahí. Si el código cambia, cambia el inventario, y el texto legal se revisa.
2. **Lo legal describe lo que el código hace**, no lo que se quisiera que hiciera. Una promesa que el código no cumple es peor que no prometer.
3. **Mismos módulos, distinto calibre.** Una calculadora sin datos personales y una app que consulta placas comparten la estructura, no la profundidad.
4. **Cada módulo tiene dirección.** Se debe saber en qué archivo vive.
5. **Texto legal como datos, no como código copiado.** Un solo generador (HTML y PDF) alimentado por contenido estructurado.

## 2. Clase de dato (decide el calibre mínimo de legal y seguridad)

| Clase | Qué maneja | Ejemplo |
|---|---|---|
| **A** | Nada personal. Solo contenido estático o cálculos locales | Calculadora, landing |
| **B** | Datos técnicos o pseudónimos: IP, user-agent, ID de sesión, analítica, anuncios | Casi toda app con GA/AdSense |
| **C** | Datos personales entregados voluntariamente: email, nombre, cuenta, formularios | App con registro o contacto |
| **D** | Datos de terceros, financieros, de salud, de menores, o identificadores vinculables a una persona | Placas + historial de multas, cédulas |

**La clase de la app es la más alta de cualquiera de sus módulos.**

### Calibre mínimo por clase

| Módulo | A | B | C | D |
|---|---|---|---|---|
| M04 Legal | 1 | 2 | 3 | 3 |
| M05 Analítica | 0–1 | 2 | 2 | 2 |
| M07 Seguridad | 1 | 2 | 2 | 3 |
| M11 Operación | 1 | 1 | 2 | 2 |
| M12 Admin | 0 | 1 | 2 | 3 |

## 3. Escala de calibre

| Nivel | Nombre | Significado |
|---|---|---|
| 0 | Ausente | No existe |
| 1 | Básico | Existe, funciona, sin cuidado de borde |
| 2 | Sólido | Cubre el caso normal y los errores comunes; documentado |
| 3 | Fuerte | Revisado contra riesgos, probado, con registro de cambios |

## 4. Los 12 módulos

Para cada uno: qué es, dónde vive (convención) y qué significa cada calibre.

### M01 · Identidad y propósito
Nombre, dominio, dueño, a quién sirve, qué promete.
`APP_PROFILE.md` §1 · `public/manifest.json` · `metadata.json`
- **1:** nombre y dominio. **2:** propósito y público definidos. **3:** promesa de producto alineada con lo que dicen los textos legales y el SEO.

### M02 · Núcleo de producto
El flujo principal que justifica la app.
`src/App.tsx` o `src/features/<nombre>/`
- **1:** funciona. **2:** estados vacíos, errores y carga resueltos. **3:** probado de punta a punta.

### M03 · Datos y backend
Fuente de datos, API propia, proxy, secretos.
`server.ts` · `server/` · `.env.example`
- **1:** conexión directa, claves con valor por defecto en código. **2:** secretos solo por entorno, validación de entrada. **3:** permisos mínimos en la base (RLS/solo lectura), tiempos de espera, caché, métricas.

### M04 · Legal y privacidad
Ver desglose abajo (L1–L7).
`src/legal/` · rutas `/privacidad`, `/terminos`, `/cookies`, `/contacto`, `/acerca`
- **1:** textos existen. **2:** páginas HTML públicas, enlazadas desde el pie, con fecha y versión. **3:** generados desde el inventario de datos, con consentimiento, canal de derechos y registro de cambios.

#### Piezas de M04
| Pieza | Contenido mínimo |
|---|---|
| **L1 Acerca / Independencia** | Quién es, qué no es (si no es oficial, decirlo), origen de datos |
| **L2 Política de privacidad** | Responsable (nombre, identificación, dirección, correo), qué se recolecta, finalidad, base de autorización, retención, terceros, derechos, cómo ejercerlos, seguridad (solo lo verificable) |
| **L3 Términos de uso** | Aceptación, objeto, uso permitido y prohibido, propiedad intelectual, exención de garantías sobre los datos, límite de responsabilidad, enlaces y publicidad de terceros, cambios a los términos, ley aplicable y jurisdicción |
| **L4 Cookies y consentimiento** | Lista de cookies/almacenamiento por categoría; banner con aceptar/rechazar; analítica y anuncios solo después de aceptar |
| **L5 Canal de derechos** | Correo del dominio, plazos legales, plantilla de solicitud, quién responde |
| **L6 Descargos / avisos** | "No es asesoría legal", "no es fuente oficial", etc., cerca de donde se muestra el dato |
| **L7 Registro de cambios** | Versión, fecha, qué cambió. Una sola fecha para todos los documentos |

### M05 · Analítica y medición
`index.html` (tags) · `server/analytics*` · panel admin
- **1:** contador simple. **2:** analítica con minimización (sin identificadores de terceros guardados en claro). **3:** consentimiento previo, retención definida, borrado automático.

### M06 · Monetización
Anuncios, afiliados, pagos, donaciones.
- **1:** anuncio o enlace puesto. **2:** política de anuncios declarada. **3:** cargado solo con consentimiento, ubicación que no confunde con contenido oficial.

### M07 · Seguridad y control de abuso
`server.ts` (middleware) · cabeceras · límites
- **1:** HTTPS. **2:** límite de peticiones, cabeceras de seguridad, validación de entrada, `.map` ocultos. **3:** rutas administrativas con autenticación, protección anti-bots verificada en servidor, alertas.

### M08 · SEO y descubribilidad
`index.html` · `public/robots.txt` · `sitemap.xml`
- **1:** título y descripción. **2:** canonical, Open Graph, sitemap. **3:** datos estructurados, 404 reales, páginas legales indexables.

### M09 · PWA y plataforma
`public/manifest.json` · `public/sw.js`
- **1:** favicon. **2:** instalable. **3:** caché offline pensada, versionado del service worker.

### M10 · UI y marca
`src/index.css` · componentes compartidos
- **1:** estilos ad hoc. **2:** tokens (colores, tipografía) y componentes reutilizables. **3:** accesibilidad revisada, modo claro/oscuro, misma marca en HTML y PDF.

### M11 · Operación
Build, deploy, variables de entorno, respaldos, monitoreo.
`package.json` · `.env.example` · `README`
- **1:** corre en mi máquina. **2:** deploy reproducible, `.env.example` completo, datos persistentes fuera del contenedor. **3:** pruebas, respaldo, monitoreo de caídas.

### M12 · Administración interna
Panel de visitas, soporte, herramientas del dueño.
- **1:** ruta oculta. **2:** protegida por contraseña/token. **3:** con registro de accesos y datos agregados (no individuales).

## 5. Estructura de carpetas estándar

```
APP_BLUEPRINT.md        # igual en todas
APP_PROFILE.md          # único por app
CLAUDE.md               # puntero
src/
  legal/
    content.ts          # contenido estructurado (secciones, versión, fecha)
    LegalPage.tsx       # render HTML (una ruta por documento)
    toPdf.ts            # mismo contenido → PDF (opcional)
    consent.ts          # estado del consentimiento
  config/
    app.profile.ts      # datos de la app que el código necesita (nombre, correo, responsable)
server/
  middleware/           # rate-limit, auth admin, cabeceras
  analytics/            # almacenamiento y retención
```

## 6. Inventario de datos (plantilla)

Una fila por dato. Es la fuente de la política de privacidad.

| Dato | Dónde se captura | Finalidad | Autorización | Dónde se guarda | Retención | Terceros | ¿Lo dice la política? |
|---|---|---|---|---|---|---|---|
| ej. IP | servidor, cada visita | estadística, seguridad | aviso + consentimiento | archivo X / BD Y | 30 días | — | sí / no |

Regla: **si una fila dice "no" en la última columna, hay que corregir el texto o el código antes de publicar.**

## 7. Auditoría al abrir una app (10 minutos)

1. **Clase de dato:** ¿qué módulo maneja el dato más sensible? Fijar clase A–D.
2. **Inventario vs. política:** recorrer cada fila del inventario y confirmar que el texto legal lo dice y que es cierto.
3. **Búsqueda de lo que se guarda:** `grep -rn "localStorage\|sessionStorage\|writeFile\|INSERT\|\.push(" src server`
4. **Terceros cargados:** `grep -n "googletagmanager\|adsbygoogle\|facebook\|hotjar\|<script" index.html`
5. **Consentimiento:** ¿esos terceros cargan antes de que el usuario acepte?
6. **Endpoints sin protección:** listar rutas `/api/*` y cuáles devuelven datos sin autenticación.
7. **Secretos en el repo:** `grep -rn "key\|secret\|token\|password" --include=*.ts --include=*.env*` y revisar valores por defecto.
8. **Límite de peticiones:** ¿hay rate limit en el servidor o solo verificación en el cliente?
9. **Páginas legales:** ¿cada documento tiene URL propia, indexable, enlazada en el pie?
10. **Una sola fecha/versión** en todos los documentos legales.
11. **Canal de derechos:** correo del dominio, plazos, responsable identificado.
12. **Retención:** ¿cuánto se guarda cada dato y quién lo borra?

Resultado: llenar la tabla de calibres del `APP_PROFILE.md` (actual vs. objetivo) y la lista de deuda (P0/P1/P2).

## 8. Protocolo para Claude al abrir una app

1. Leer `APP_PROFILE.md` y este archivo.
2. Resumir en cinco líneas: clase de dato, calibres, deuda P0, fecha de la última auditoría, qué cambió desde entonces (`git log --since=<fecha>`).
3. Si el cambio toca un módulo con calibre ≥ 2 o el inventario de datos, avisar antes de seguir.
4. Al terminar el trabajo: actualizar `APP_PROFILE.md` (calibres, deuda, bitácora).
5. Si algo en el código contradice un texto legal, decirlo aunque no lo hayan pedido.

## 9. Plan para las seis apps

**Fase 0 — Triage (una tabla, 30 min).**

| App | Dominio | Stack | Clase | Maneja datos de terceros | GA/Ads | Panel admin | Prioridad |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |

Orden: primero las de clase D, luego las que cargan anuncios/analítica, luego las demás.

**Fase 1 — Pegar y llenar.** Copiar los 3 archivos a cada repo, llenar `APP_PROFILE.md` con la auditoría de §7.

**Fase 2 — M04 y M07 primero.** Es donde está el riesgo (legal y seguridad). Construir `src/legal/` una vez en la app piloto (MultasPagas) y copiarlo a las demás.

**Fase 3 — Resto por calibre.** Subir módulos de 1 a 2, y solo después de 2 a 3 donde valga la pena.

---
*Versión 1 · octubre de 2026. Este esquema es una guía técnica, no asesoría jurídica; los textos legales finales conviene revisarlos con un abogado.*

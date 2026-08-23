# Widget de chat agentico (Oven) en Recomendaciones

Integra el asistente conversacional de Oven como embebido dentro de la pagina de
**Recomendaciones**, para que el usuario pueda preguntar sobre sus sugerencias
financieras sin salir de la aplicacion.

## Piezas

| Archivo | Rol |
| --- | --- |
| `src/compartido/configuracion/ovenWidget.ts` | Resuelve la configuracion: runtime > build > valores por defecto. |
| `src/compartido/componentes/OvenChatWidget.tsx` | Inyecta el script IIFE con sus atributos `data-*` y lo limpia al desmontar. |
| `src/compartido/componentes/personalizacionOven.ts` | Ajustes de UI que el embed no expone (textos en espanol, ocultar acciones rapidas). |
| `src/modulos/recomendaciones/presentacion/RecommendationsPage.tsx` | Monta el widget junto a las tres vistas del modulo. |
| `public/oven-config.js` | Marcador de posicion para `npm run dev`. |
| `docker/15-oven-defaults.envsh` | Valores por defecto, origenes derivados y politica CSP. |
| `docker/30-oven-config.sh` | Regenera `/oven-config.js` en cada arranque del contenedor. |
| `docker/default.conf.template` | nginx: CSP, SPA, proxy `/api/` y pasarela `/oven-api/`. |

## Configuracion

La configuracion **no esta incrustada en el bundle**: se resuelve en este orden.

1. `window.__OVEN_CONFIG__` — generado en tiempo de ejecucion por el contenedor a
   partir de variables `OVEN_*`. Cambiarlas no obliga a reconstruir la imagen.
2. `import.meta.env.VITE_OVEN_*` — variables de `.env`, solo para `npm run dev`.
3. Valores por defecto del embed original, para que la demo funcione sin configurar nada.

| Variable Docker | Variable dev | Valor por defecto |
| --- | --- | --- |
| `OVEN_HABILITADO` | `VITE_OVEN_HABILITADO` | `true` |
| `OVEN_WIDGET_SRC` | `VITE_OVEN_WIDGET_SRC` | script IIFE en Vercel Blob |
| `OVEN_API_URL` | `VITE_OVEN_API_URL` | `/oven-api` (pasarela same-origin) |
| `OVEN_EMBED_KEY` | `VITE_OVEN_EMBED_KEY` | `ovek_8a895c...` |
| `OVEN_TENANT` | `VITE_OVEN_TENANT` | `clinica-dandia` |
| `OVEN_AGENT` | `VITE_OVEN_AGENT` | `example-tool-agent` |
| `OVEN_THEME` / `OVEN_VISUAL_STYLE` / `OVEN_POSITION` | idem `VITE_*` | `ocean` / `ocean` / `bottom-right` |

Para desactivar el widget (por ejemplo en un entorno de pruebas):
`OVEN_HABILITADO=false`.

## CORS y CSP

Son dos bloqueos distintos y se resuelven en capas distintas.

**CSP (lo controlamos nosotros).** nginx envia una `Content-Security-Policy` que
permite explicitamente el origen del script del widget y las conexiones al backend
del agente (`connect-src`, incluida su variante `wss://` para streaming). Sin esta
lista, el navegador bloquea el widget en cuanto la app se sirve desde un dominio
propio. Se construye en `docker/15-oven-defaults.envsh` a partir de
`OVEN_WIDGET_SRC` y `OVEN_API_ORIGIN`, asi que sigue a la configuracion sin tocar
la imagen. `OVEN_EXTRA_CSP` permite anadir origenes sueltos.

**CORS del proveedor (no lo controlamos).** El `Access-Control-Allow-Origin` que
acepta nuestro dominio lo emite el servidor de Oven. Si al desplegar el dominio
publico no esta en su lista, el navegador rechaza las llamadas y no hay cabecera
que podamos anadir desde aqui para evitarlo.

Se comprobo contra el entorno real: `GET https://oven-dandia-...vercel.app/api/tenants/clinica-dandia/public`
devuelve 200 pero **sin** cabecera `Access-Control-Allow-Origin`, por lo que el navegador
descarta la respuesta y el widget se queda en blanco.

Por eso el valor por defecto de `OVEN_API_URL` es la pasarela **`/oven-api/`** de nginx:
reenvia servidor a servidor a `OVEN_API_ORIGIN` (la URL original del proveedor, sin
cambios), con streaming SSE habilitado (`proxy_buffering off`). El widget hace todas sus
peticiones al mismo origen y CORS deja de aplicar. En desarrollo, `vite.config.ts` replica
esa misma ruta.

Cuando el proveedor autorice el dominio, se vuelve al modo directo poniendo la URL
completa en `OVEN_API_URL`; no hay que tocar codigo ni reconstruir la imagen.

El endpoint `/api/chat-commands` responde 401 tanto directo como por la pasarela: es un
endpoint de administracion del proveedor y el widget funciona igual sin el.

**API propia.** La aplicacion llama a `/api` en rutas relativas y nginx lo reenvia
a la API Java, asi que tampoco hay CORS entre frontend y backend. La configuracion
CORS del backend (`FRONTEND_ORIGIN`, lista separada por comas con comodines) solo
hace falta para el modo dev y para clientes en otro dominio.

## Detalle de implementacion: el id del script

El widget crea su propio `<div id="oven-chat-widget">` y le hace `attachShadow`. Si el
`<script>` cargador usa ese mismo id, el widget lo encuentra primero y falla con
`NotSupportedError: Failed to execute 'attachShadow' on 'Element'`, quedandose invisible
sin mas sintoma. Por eso el script se inyecta con id `oven-chat-widget-loader`.

## Personalizacion de la interfaz del widget

El embed de Oven no permite configurar sus textos ni ocultar la accion rapida del panel,
y el widget se dibuja dentro de un shadow root propio. `personalizacionOven.ts` observa
ese shadow root y reaplica los ajustes en cada render (al abrir el panel, al llegar un
mensaje, etc.):

| Ajuste | Variable | Valor por defecto |
| --- | --- | --- |
| Texto del compositor | `OVEN_TEXTO_ENTRADA` / `VITE_OVEN_TEXTO_ENTRADA` | `Escribe un mensaje...` |
| Ocultar accion rapida ("Agendar cita") | `OVEN_OCULTAR_ACCIONES` / `VITE_OVEN_OCULTAR_ACCIONES` | `true` |

Los textos fijos que el widget trae en ingles se sustituyen desde la tabla `TRADUCCIONES`
del mismo archivo (hoy, el saludo `How can we help you today?`). Anadir uno mas es una
linea en esa tabla.

Dos precauciones de implementacion:

- La accion rapida se localiza con `section > div > a[href]`, es decir, un enlace que
  cuelga **directamente** del panel. Los enlaces que el agente envie dentro de un mensaje
  quedan mas anidados y no coinciden, asi que no se borran por error.
- Las traducciones solo se aplican a elementos hoja cuyo texto coincide **por completo**
  con la clave, para no alterar el contenido de las respuestas del agente.

Siguen en ingles, por si se quieren traducir tambien: el estado `Online` de la cabecera y
las etiquetas de accesibilidad `Close chat` y `Send message`.

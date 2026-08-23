/**
 * Configuracion del widget de chat agentico (Oven) embebido en Recomendaciones.
 *
 * Los valores se resuelven en este orden de prioridad:
 *   1. window.__OVEN_CONFIG__  -> inyectado en tiempo de ejecucion por el contenedor
 *      (docker/entrypoint.sh genera /oven-config.js a partir de variables de entorno).
 *   2. import.meta.env.VITE_OVEN_* -> inyectado en tiempo de compilacion por Vite (modo dev).
 *   3. Valores por defecto -> los del embed original, para que la demo funcione sin configurar nada.
 */

export type ConfiguracionWidgetOven = {
  src: string;
  apiUrl: string;
  embedKey: string;
  tenant: string;
  agent: string;
  theme: string;
  visualStyle: string;
  position: string;
  habilitado: boolean;
  /** Texto del compositor de mensajes: el widget lo trae en ingles y no es configurable. */
  textoEntrada: string;
  /** Oculta el enlace de accion rapida del panel ("Agendar cita"). */
  ocultarAccionesRapidas: boolean;
  /** Muestra las preguntas de arranque con tono financiero en la conversacion vacia. */
  preguntasIniciales: boolean;
};

const VALORES_POR_DEFECTO = {
  src: 'https://nemxenkgdsjuucmp.public.blob.vercel-storage.com/widget/oven-chat-widget.iife.js',
  // Ruta same-origin: nginx (y el proxy de Vite en dev) la reenvian a
  // https://oven-dandia-nwlcfzg7s-dandia-source.vercel.app. Se usa la pasarela porque el
  // backend de Oven no devuelve Access-Control-Allow-Origin para nuestros dominios, asi
  // que la llamada directa desde el navegador queda bloqueada por CORS.
  apiUrl: '/oven-api',
  embedKey: 'ovek_8a895c59916adc7cec8182e1e5554294826b',
  tenant: 'clinica-dandia',
  agent: 'example-tool-agent',
  theme: 'ocean',
  visualStyle: 'ocean',
  position: 'bottom-right',
  textoEntrada: 'Escribe un mensaje...'
} as const;

function resolver(claveRuntime: keyof typeof VALORES_POR_DEFECTO, valorBuild: string | undefined): string {
  const runtime = typeof window !== 'undefined' ? window.__OVEN_CONFIG__?.[claveRuntime] : undefined;
  return (runtime ?? valorBuild ?? VALORES_POR_DEFECTO[claveRuntime]).trim();
}

function leerBooleano(runtime: string | undefined, build: string | undefined, porDefecto: boolean): boolean {
  const valor = runtime ?? build;
  if (valor === undefined) return porDefecto;
  return valor.trim().toLowerCase() !== 'false';
}

export function obtenerConfiguracionWidgetOven(): ConfiguracionWidgetOven {
  const entorno = import.meta.env;
  const habilitadoRuntime = typeof window !== 'undefined' ? window.__OVEN_CONFIG__?.habilitado : undefined;
  const habilitadoBuild = entorno.VITE_OVEN_HABILITADO;
  const habilitado = leerBooleano(habilitadoRuntime, habilitadoBuild, true);

  return {
    src: resolver('src', entorno.VITE_OVEN_WIDGET_SRC),
    apiUrl: resolver('apiUrl', entorno.VITE_OVEN_API_URL),
    embedKey: resolver('embedKey', entorno.VITE_OVEN_EMBED_KEY),
    tenant: resolver('tenant', entorno.VITE_OVEN_TENANT),
    agent: resolver('agent', entorno.VITE_OVEN_AGENT),
    theme: resolver('theme', entorno.VITE_OVEN_THEME),
    visualStyle: resolver('visualStyle', entorno.VITE_OVEN_VISUAL_STYLE),
    position: resolver('position', entorno.VITE_OVEN_POSITION),
    habilitado,
    textoEntrada: resolver('textoEntrada', entorno.VITE_OVEN_TEXTO_ENTRADA),
    ocultarAccionesRapidas: leerBooleano(
      typeof window !== 'undefined' ? window.__OVEN_CONFIG__?.ocultarAccionesRapidas : undefined,
      entorno.VITE_OVEN_OCULTAR_ACCIONES,
      true
    ),
    preguntasIniciales: leerBooleano(
      typeof window !== 'undefined' ? window.__OVEN_CONFIG__?.preguntasIniciales : undefined,
      entorno.VITE_OVEN_PREGUNTAS_INICIALES,
      true
    )
  };
}

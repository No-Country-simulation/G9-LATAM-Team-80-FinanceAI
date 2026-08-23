/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Configuracion del widget de chat agentico (Oven) resuelta en tiempo de compilacion. */
  readonly VITE_OVEN_HABILITADO?: string;
  readonly VITE_OVEN_WIDGET_SRC?: string;
  readonly VITE_OVEN_API_URL?: string;
  readonly VITE_OVEN_EMBED_KEY?: string;
  readonly VITE_OVEN_TENANT?: string;
  readonly VITE_OVEN_AGENT?: string;
  readonly VITE_OVEN_THEME?: string;
  readonly VITE_OVEN_VISUAL_STYLE?: string;
  readonly VITE_OVEN_POSITION?: string;
  readonly VITE_OVEN_TEXTO_ENTRADA?: string;
  readonly VITE_OVEN_OCULTAR_ACCIONES?: string;
  readonly VITE_OVEN_PREGUNTAS_INICIALES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Configuracion inyectada en tiempo de ejecucion por docker/entrypoint.sh (ver /oven-config.js). */
  __OVEN_CONFIG__?: {
    habilitado?: string;
    src?: string;
    apiUrl?: string;
    embedKey?: string;
    tenant?: string;
    agent?: string;
    theme?: string;
    visualStyle?: string;
    position?: string;
    textoEntrada?: string;
    ocultarAccionesRapidas?: string;
    preguntasIniciales?: string;
  };
}

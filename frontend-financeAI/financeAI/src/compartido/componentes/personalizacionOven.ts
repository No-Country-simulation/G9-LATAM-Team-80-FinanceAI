/**
 * Ajustes sobre la interfaz del widget de Oven que su embed no expone como opcion.
 *
 * El widget se dibuja dentro de un shadow root propio, asi que aqui se observa ese
 * arbol y se reaplican los cambios cada vez que el widget vuelve a renderizar
 * (al abrir el panel, al llegar un mensaje, etc.).
 */

/** Enlace de accion rapida del panel (hoy, "Agendar cita", que viene de schedulingUrl). */
const SELECTOR_ACCIONES_RAPIDAS = 'section > div > a[href]';

/** Contenedor de esas acciones: se oculta si queda vacio, para no dejar un hueco. */
const SELECTOR_CONTENEDOR_ACCIONES = 'section > div.px-3';

/** Caja de texto del compositor de mensajes. */
const SELECTOR_ENTRADA = 'textarea';

/** Boton de envio del compositor. */
const SELECTOR_ENVIAR = 'button[aria-label="Send message"]';

/** Marca los nodos que inyectamos nosotros, para no duplicarlos en cada render. */
const ATRIBUTO_INYECTADO = 'data-financeai';

/**
 * Textos que el widget trae en ingles y no son configurables desde el embed.
 * La clave es el texto exacto del elemento; solo se sustituyen coincidencias completas
 * en elementos hoja, para no tocar el contenido de los mensajes del agente.
 */
const SALUDO_ORIGINAL = 'How can we help you today?';

const TRADUCCIONES: Record<string, string> = {
  [SALUDO_ORIGINAL]: 'Hablemos de tu plata, sin juicios. ¿Por dónde empezamos?'
};

/**
 * Preguntas de arranque que se muestran mientras la conversacion esta vacia.
 * Al pulsarlas se escriben en el compositor y se envian al agente.
 */
const PREGUNTAS_INICIALES = [
  '🔍 ¿En qué se me fue la plata este mes?',
  '📊 ¿Cómo voy con mis finanzas? Sé honesto.',
  '✈️ ¿Me alcanza para ese viaje o es puro sueño?',
  '💡 Dame un truco para ahorrar sin sufrir'
];

export type PersonalizacionOven = {
  textoEntrada: string;
  ocultarAccionesRapidas: boolean;
  preguntasIniciales: boolean;
};

function traducirTextos(raiz: ShadowRoot): void {
  raiz.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, button').forEach((elemento) => {
    if (elemento.children.length > 0 || elemento.hasAttribute(ATRIBUTO_INYECTADO)) return;
    const traduccion = TRADUCCIONES[(elemento.textContent ?? '').trim()];
    if (traduccion) elemento.textContent = traduccion;
  });
}

/**
 * Escribe la pregunta en el compositor y la envia. El textarea lo controla React, asi que
 * hay que usar el setter nativo y disparar el evento para que el widget se entere del cambio.
 */
function enviarPregunta(raiz: ShadowRoot, pregunta: string): void {
  const entrada = raiz.querySelector<HTMLTextAreaElement>(SELECTOR_ENTRADA);
  if (!entrada) return;

  const setterNativo = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setterNativo?.call(entrada, pregunta);
  entrada.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  raiz.querySelector<HTMLButtonElement>(SELECTOR_ENVIAR)?.click();
}

function crearPregunta(raiz: ShadowRoot, pregunta: string): HTMLButtonElement {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.setAttribute(ATRIBUTO_INYECTADO, 'pregunta-inicial');
  boton.textContent = pregunta;
  // Estilos en linea con las variables del propio widget: asi sigue su tema sin depender
  // de las clases de utilidad que genere su bundle.
  boton.style.cssText = [
    'display:block',
    'width:100%',
    'text-align:left',
    'cursor:pointer',
    'padding:8px 12px',
    'font:inherit',
    'font-size:13px',
    'line-height:1.35',
    'border:1px solid color-mix(in srgb, var(--oven-widget-primary, #0288D1) 35%, transparent)',
    'border-radius:calc(var(--oven-widget-border-radius, 16px) / 2)',
    'background:var(--oven-widget-surface, #E1F5FE)',
    'color:var(--oven-widget-text, #01579B)'
  ].join(';');
  boton.addEventListener('click', () => enviarPregunta(raiz, pregunta));
  return boton;
}

/**
 * Localiza el contenedor del estado vacio a partir del texto del saludo, que solo existe
 * mientras no hay conversacion. Buscar un <p> cualquiera no sirve: en cuanto llega el
 * primer mensaje, los <p> de las burbujas coincidirian y las preguntas se colarian
 * dentro del hilo.
 */
function localizarEstadoVacio(raiz: ShadowRoot): HTMLElement | null {
  const saludos = [SALUDO_ORIGINAL, TRADUCCIONES[SALUDO_ORIGINAL]];
  for (const parrafo of Array.from(raiz.querySelectorAll('section p'))) {
    if (saludos.includes((parrafo.textContent ?? '').trim())) {
      return parrafo.parentElement as HTMLElement | null;
    }
  }
  return null;
}

function pintarPreguntasIniciales(raiz: ShadowRoot): void {
  const estadoVacio = localizarEstadoVacio(raiz);

  // Al empezar la conversacion el estado vacio desaparece: se retiran las preguntas.
  raiz.querySelectorAll(`[${ATRIBUTO_INYECTADO}="preguntas-iniciales"]`).forEach((lista) => {
    if (!estadoVacio || lista.parentElement !== estadoVacio) lista.remove();
  });

  if (!estadoVacio || estadoVacio.querySelector(`[${ATRIBUTO_INYECTADO}]`)) return;

  const lista = document.createElement('div');
  lista.setAttribute(ATRIBUTO_INYECTADO, 'preguntas-iniciales');
  lista.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:100%;max-width:20rem';
  PREGUNTAS_INICIALES.forEach((pregunta) => lista.appendChild(crearPregunta(raiz, pregunta)));
  estadoVacio.appendChild(lista);
}

function aplicar(raiz: ShadowRoot, ajustes: PersonalizacionOven): void {
  if (ajustes.ocultarAccionesRapidas) {
    // Solo los enlaces que cuelgan directamente del panel: los que el agente envie
    // dentro de un mensaje quedan mas anidados y no coinciden con el selector.
    raiz.querySelectorAll(SELECTOR_ACCIONES_RAPIDAS).forEach((enlace) => enlace.remove());

    raiz.querySelectorAll<HTMLElement>(SELECTOR_CONTENEDOR_ACCIONES).forEach((contenedor) => {
      const vacio = contenedor.childElementCount === 0;
      const oculto = contenedor.style.display === 'none';
      if (vacio !== oculto) contenedor.style.display = vacio ? 'none' : '';
    });
  }

  if (ajustes.textoEntrada) {
    const entrada = raiz.querySelector<HTMLTextAreaElement>(SELECTOR_ENTRADA);
    // Se comprueba antes de asignar para no disparar el observador en bucle.
    if (entrada && entrada.placeholder !== ajustes.textoEntrada) {
      entrada.placeholder = ajustes.textoEntrada;
    }
  }

  traducirTextos(raiz);
  if (ajustes.preguntasIniciales) pintarPreguntasIniciales(raiz);
}

/**
 * Espera a que el widget cree su host con shadow root y mantiene la personalizacion
 * aplicada. Devuelve una funcion para detener la observacion.
 */
export function personalizarWidgetOven(idHost: string, ajustes: PersonalizacionOven): () => void {
  let observadorPanel: MutationObserver | null = null;

  function engancharAlPanel(): boolean {
    const raiz = document.getElementById(idHost)?.shadowRoot;
    if (!raiz) return false;
    aplicar(raiz, ajustes);
    observadorPanel = new MutationObserver(() => aplicar(raiz, ajustes));
    observadorPanel.observe(raiz, { childList: true, subtree: true });
    return true;
  }

  // El host aparece cuando el script del widget termina de cargar, no al montar el componente.
  const observadorHost = new MutationObserver(() => {
    if (engancharAlPanel()) observadorHost.disconnect();
  });
  if (!engancharAlPanel()) {
    observadorHost.observe(document.body, { childList: true });
  }

  return () => {
    observadorHost.disconnect();
    observadorPanel?.disconnect();
  };
}

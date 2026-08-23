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
  [SALUDO_ORIGINAL]: '¿Qué quieres revisar?'
};

/**
 * Preguntas de arranque que se muestran mientras la conversacion esta vacia.
 * Al pulsarlas se escriben en el compositor y se envian al agente.
 */
const PREGUNTAS_INICIALES = [
  '¿Qué significa el nivel de endeudamiento?',
  '¿Cómo puedo organizar mejor mis gastos?',
  '¿Cómo construir un fondo de emergencia?'
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
  /*
   * Sugerencia de conversacion, no campo de formulario: fondo blanco y borde neutro.
   * Con fondo relleno y borde azul se leian como inputs y competian con el compositor.
   */
  boton.style.cssText = [
    'display:block',
    'width:100%',
    'text-align:left',
    'cursor:pointer',
    'padding:9px 12px',
    'font:inherit',
    'font-size:13px',
    'line-height:1.35',
    'border:1px solid #E4E9F3',
    'border-radius:11px',
    'background:#FFFFFF',
    'color:#0D1838',
    'transition:background 140ms ease, border-color 140ms ease'
  ].join(';');
  boton.addEventListener('mouseenter', () => {
    boton.style.background = '#F4F7FF';
    boton.style.borderColor = '#C9D8FA';
  });
  boton.addEventListener('mouseleave', () => {
    boton.style.background = '#FFFFFF';
    boton.style.borderColor = '#E4E9F3';
  });
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
  lista.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:100%;text-align:left';

  const rotulo = document.createElement('p');
  rotulo.setAttribute(ATRIBUTO_INYECTADO, 'rotulo-sugerencias');
  rotulo.textContent = 'Sugerencias';
  rotulo.style.cssText = 'margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.11em;text-transform:uppercase;color:#6D7897';
  lista.appendChild(rotulo);

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

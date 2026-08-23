import { X } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconoRobot } from './IconoRobot';
import { OvenChatWidget } from './OvenChatWidget';
import './agente.css';

/** Host que el widget de Oven crea en <body> y sobre el que monta su shadow root. */
const ID_HOST = 'oven-chat-widget';

/** Marca del <style> que inyectamos dentro del shadow root, para no duplicarlo. */
const ID_ESTILO = 'financeai-presentacion';

/**
 * Selectores del widget. Son semanticos a proposito: aria-label y role sobreviven a
 * cambios de clases mucho mejor que los selectores de Tailwind del bundle.
 */
const SELECTOR_ABRIR = 'button[aria-label="Open chat"]';
const SELECTOR_CERRAR = 'button[aria-label="Close chat"]';

/**
 * Paleta de FinanceAI escrita sobre las variables que el propio widget declara en el
 * nodo de su panel. Es la via que Oven soporta para el tema, asi que se prefiere a
 * pelear con las clases de utilidad de su bundle: alcanza a los mensajes, al foco del
 * compositor y a los botones sin depender de nombres de clase generados.
 */
const TEMA: Record<string, string> = {
  '--oven-widget-primary': '#2458E8',
  '--oven-widget-primary-contrast': '#FFFFFF',
  '--oven-widget-surface': '#F4F7FF',
  '--oven-widget-background': '#FFFFFF',
  '--oven-widget-text': '#0D1838',
  '--oven-widget-text-secondary': '#6D7897',
  '--oven-widget-border': '#E4E9F3',
  '--oven-widget-border-radius': '14px',
  /*
   * El widget declara la clase font-[var(--oven-widget-font-family,Inter,...)] pero esa
   * utilidad nunca llega generada en su bundle, asi que hoy esta variable no pinta nada.
   * Se deja porque es el canal que Oven documenta; la tipografia real la fija REGLAS.
   */
  '--oven-widget-font-family': "'Manrope', 'Geist', system-ui, sans-serif"
};

/** Region que el panel de Oven debe ocupar: el hueco de la burbuja bajo nuestra cabecera. */
type Zona = { left: number; top: number; width: number; height: number };

function shadowDelWidget(): ShadowRoot | null {
  return document.getElementById(ID_HOST)?.shadowRoot ?? null;
}

/*
 * Correcciones que no pasan por las variables de tema porque el widget las trae como
 * clases literales de Tailwind.
 */
const REGLAS = `
  /* Su burbuja se oculta pero sigue en el arbol: un click programatico funciona
     igual sobre un boton invisible, y asi conservamos su logica de apertura. */
  ${SELECTOR_ABRIR} { opacity: 0 !important; pointer-events: none !important; }

  /* Su cabecera con degradado azul-cian la reemplaza la nuestra. */
  [role="banner"] { display: none !important; }

  /* bg-blue-50: la gran superficie azul del cuerpo. El chat va en blanco. */
  section { background: #FFFFFF !important; }

  /* El estado vacio venia centrado verticalmente con justify-center y repartia el
     saludo y las sugerencias por el alto del panel. Arranca arriba. */
  section > div > div[class*="justify-center"] {
    justify-content: flex-start !important;
    padding: 14px 14px 16px !important;
    text-align: left !important;
    align-items: stretch !important;
  }

  /* Compositor: franja blanca compacta, sin el borde azul del tema ocean. */
  section > div[class*="border-t"] {
    padding: 12px 14px !important;
    border-top-color: #E4E9F3 !important;
    background: #FFFFFF !important;
  }
  /*
   * Tipografia. El compositor salia en monospace de 13.33px, que es el valor por
   * defecto del navegador para <textarea>: los controles de formulario no heredan la
   * fuente del contenedor. Y el resto del widget se quedaba en Inter porque la utilidad
   * font-[var(--oven-widget-font-family,...)] no existe en su bundle. Se fija aqui para
   * que el texto escrito y el saludo pertenezcan al mismo sistema tipografico.
   *
   * Se excluyen code y pre: si el agente responde con un bloque de codigo, debe
   * conservar su monoespaciada.
   */
  *:not(:is(code, pre, code *, pre *)) {
    font-family: 'Manrope', system-ui, sans-serif !important;
  }

  textarea {
    border-radius: 14px !important;
    border-color: #E4E9F3 !important;
    min-height: 44px !important;
    padding: 11px 14px !important;
    font-size: 15px !important;
    font-weight: 400 !important;
    line-height: 1.5 !important;
    letter-spacing: 0 !important;
  }

  textarea::placeholder {
    color: #6D7897 !important;
    opacity: 0.8 !important;
  }
  button[aria-label="Send message"] {
    width: 42px !important;
    height: 42px !important;
    border-radius: 12px !important;
    background: #2458E8 !important;
    box-shadow: none !important;
  }
`;

/**
 * Reemplaza la presentacion del widget por la de FinanceAI, sin duplicar el chat.
 *
 * Oven no expone API para abrir o cerrar (window.OvenChat solo tiene init y destroy),
 * pero su shadow root esta en modo "open", asi que se puede:
 *   - ocultar su burbuja y su cabecera propia con CSS inyectado;
 *   - encajar su panel en el hueco de nuestra burbuja;
 *   - accionar sus botones internos por codigo.
 *
 * La conversacion sigue siendo la suya: no se crea un segundo chat.
 */
function aplicarPresentacion(zona: Zona | null): boolean {
  const raiz = shadowDelWidget();
  if (!raiz) return false;

  let estilo = raiz.getElementById?.(ID_ESTILO) as HTMLStyleElement | null;
  if (!estilo) {
    estilo = document.createElement('style');
    estilo.id = ID_ESTILO;
    raiz.appendChild(estilo);
  }
  /*
   * Escribir solo si cambio. Este <style> vive DENTRO del shadow root observado, y
   * asignar textContent reemplaza su nodo de texto: es una mutacion de childList que
   * volvia a disparar al MutationObserver, que volvia a escribir. Una sola mutacion
   * externa encadenaba llamadas sin fin y congelaba la pestaña.
   */
  if (estilo.textContent !== REGLAS) estilo.textContent = REGLAS;

  /*
   * La geometria y el tema van en el nodo, no en una regla: su panel no tiene selector
   * estable. Se parte del textarea y se sube hasta el contenedor posicionado, en vez de
   * usar "div > div": con el panel cerrado ese selector apunta al contenedor de la
   * burbuja y le aplicaria la geometria al elemento equivocado.
   *
   * Escribir en style.* es una mutacion de atributo, y el observador solo mira
   * childList/subtree, asi que estas escrituras no lo despiertan.
   */
  const entrada = raiz.querySelector<HTMLElement>('textarea');
  if (!entrada) return true; // panel cerrado: no hay nada que reubicar
  let panel: HTMLElement | null = entrada.closest('div');
  while (panel?.parentElement instanceof HTMLElement && getComputedStyle(panel).position !== 'fixed') {
    panel = panel.parentElement;
  }
  if (!panel || !zona) return true;

  for (const [variable, valor] of Object.entries(TEMA)) {
    panel.style.setProperty(variable, valor, 'important');
  }

  /*
   * Tamaño de la ventana. Oven lo lee de estas dos variables -- su envoltorio interno
   * es w-[var(--oven-widget-max-width,400px)] h-[var(--oven-widget-max-height,600px)] --
   * asi que hay que darselas ademas de redimensionar el contenedor fijo.
   *
   * Redimensionando solo el contenedor, ese envoltorio se quedaba en los 600px por
   * defecto: el chat se dibujaba a su alto natural y el compositor terminaba 175px por
   * debajo del marco, fuera de la burbuja. Por eso la ventana se veia vacia.
   */
  panel.style.setProperty('--oven-widget-max-width', `${zona.width}px`, 'important');
  panel.style.setProperty('--oven-widget-max-height', `${zona.height}px`, 'important');

  /*
   * El panel de Oven no es hijo de nuestra burbuja -- vive en otro host del <body> --
   * asi que se encaja por coordenadas sobre el hueco que deja nuestra cabecera. Se usa
   * left/top/width/height medidos, no valores fijos, para que siga a la burbuja en
   * cualquier breakpoint.
   */
  panel.style.setProperty('position', 'fixed', 'important');
  panel.style.setProperty('left', `${zona.left}px`, 'important');
  panel.style.setProperty('top', `${zona.top}px`, 'important');
  panel.style.setProperty('right', 'auto', 'important');
  panel.style.setProperty('bottom', 'auto', 'important');
  panel.style.setProperty('width', `${zona.width}px`, 'important');
  panel.style.setProperty('height', `${zona.height}px`, 'important');
  panel.style.setProperty('max-height', 'none', 'important');
  // Solo las esquinas de abajo: arriba continua nuestra cabecera.
  panel.style.setProperty('border-radius', '0 0 19px 19px', 'important');
  panel.style.setProperty('box-shadow', 'none', 'important');
  return true;
}

export function AgenteFinanceAI({ pantalla, periodo }: { pantalla: string; periodo: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const lanzador = useRef<HTMLButtonElement>(null);
  const burbuja = useRef<HTMLDivElement>(null);

  /**
   * Hueco de la burbuja por debajo de la cabecera, medido en vivo.
   *
   * Se usan las metricas de layout (offsetTop, clientWidth) y no getBoundingClientRect: la
   * burbuja entra con transform (translateY + scale), y el rect visual devuelve la caja
   * ya deformada. Midiendo el rect durante la animacion el panel de Oven se encajaba a
   * escala 0.98 y quedaba descuadrado dentro del marco. offsetTop y clientWidth ignoran
   * el transform y, al ser la burbuja position:fixed, ya vienen en coordenadas de
   * viewport, que es lo que necesita el panel -- tambien position:fixed.
   *
   * Se mide la caja interior (client*, mas clientLeft/clientTop de desplazamiento) para
   * que el panel quede por dentro del borde de la burbuja y el marco siga viendose.
   */
  const zonaDelCuerpo = useCallback((): Zona | null => {
    const caja = burbuja.current;
    if (!caja) return null;
    const cabeceras = caja.querySelector<HTMLElement>('.fa-agente-cabeceras')?.offsetHeight ?? 0;
    return {
      left: caja.offsetLeft + caja.clientLeft,
      top: caja.offsetTop + caja.clientTop + cabeceras,
      width: caja.clientWidth,
      height: caja.clientHeight - cabeceras
    };
  }, []);

  // La presentacion se reaplica en cada render del widget: su arbol se reconstruye al
  // abrir, al escribir y al llegar cada mensaje.
  useEffect(() => {
    let observador: MutationObserver | null = null;

    /*
     * Se deja de observar mientras se aplica. Aunque la escritura del <style> ya es
     * idempotente, este componente tambien toca el arbol del widget, y personalizacionOven
     * observa el mismo shadow root: sin esta pausa cualquier cambio futuro volveria a
     * abrir la puerta a que un observer se realimente con sus propias mutaciones.
     */
    const reaplicar = () => {
      observador?.disconnect();
      aplicarPresentacion(zonaDelCuerpo());
      const raiz = shadowDelWidget();
      if (raiz) observador?.observe(raiz, { childList: true, subtree: true });
    };

    const enganchar = () => {
      const raiz = shadowDelWidget();
      if (!raiz) return false;
      observador = new MutationObserver(reaplicar);
      reaplicar();
      return true;
    };

    // El host aparece cuando termina de cargar el script, no al montar el componente.
    const esperaHost = new MutationObserver(() => { if (enganchar()) esperaHost.disconnect(); });
    if (!enganchar()) esperaHost.observe(document.body, { childList: true });

    // La burbuja se mide en px, asi que al cambiar el viewport hay que recolocar el panel.
    window.addEventListener('resize', reaplicar);

    return () => {
      window.removeEventListener('resize', reaplicar);
      esperaHost.disconnect();
      observador?.disconnect();
    };
  }, [zonaDelCuerpo]);

  const abrir = useCallback(() => {
    shadowDelWidget()?.querySelector<HTMLButtonElement>(SELECTOR_ABRIR)?.click();
    setAbierto(true);
    // El widget tarda en montar su panel; la geometria se fija cuando ya existe.
    setTimeout(() => aplicarPresentacion(zonaDelCuerpo()), 60);
  }, [zonaDelCuerpo]);

  const cerrar = useCallback(() => {
    shadowDelWidget()?.querySelector<HTMLButtonElement>(SELECTOR_CERRAR)?.click();
    setAbierto(false);
    lanzador.current?.focus();
  }, []);

  // La burbuja se dibuja tras el primer pintado, asi que se recoloca al abrirse.
  useEffect(() => {
    if (!abierto) return;
    aplicarPresentacion(zonaDelCuerpo());
  }, [abierto, zonaDelCuerpo]);

  useEffect(() => {
    if (!abierto) return;
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') cerrar();
    }
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [abierto, cerrar]);

  return (
    <>
      {/* El widget real de Oven: sigue siendo el que conversa. */}
      <OvenChatWidget />

      {/* Se mantiene visible con la burbuja abierta: cerrar es tarea de la X. */}
      <button
        ref={lanzador}
        className={`fa-agente-lanzador ${abierto ? 'activo' : ''}`}
        aria-label={abierto ? 'FinanceAI abierto' : 'Abrir FinanceAI'}
        aria-expanded={abierto}
        onClick={abrir}
      >
        <IconoRobot size={26} />
        {!abierto && <span className="fa-agente-tooltip" role="tooltip">Pregúntale a FinanceAI</span>}
      </button>

      {abierto && (
        <div className="fa-agente-burbuja" ref={burbuja} role="dialog" aria-label="FinanceAI">
          <div className="fa-agente-cabeceras">
            <header className="fa-agente-cabecera">
              <span className="fa-agente-avatar"><IconoRobot size={22} /></span>
              <div>
                <strong>FinanceAI</strong>
                <small>Tu asistente financiero</small>
              </div>
              <button className="fa-agente-cerrar" aria-label="Cerrar FinanceAI" onClick={cerrar}>
                <X size={17} />
              </button>
            </header>

            {/* Indica desde donde se abrio el agente. No implica que reciba esos datos. */}
            <p className="fa-agente-contexto">
              <span>Contexto</span>{periodo ? ` · ${pantalla} · ${periodo}` : ` · ${pantalla}`}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

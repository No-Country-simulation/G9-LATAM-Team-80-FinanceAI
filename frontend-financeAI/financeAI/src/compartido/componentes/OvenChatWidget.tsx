import { useEffect } from 'react';
import { obtenerConfiguracionWidgetOven } from '../configuracion/ovenWidget';
import { personalizarWidgetOven } from './personalizacionOven';

// El widget crea su propio <div id="oven-chat-widget"> y le hace attachShadow, asi que el
// script cargador NO puede usar ese mismo id: se lo robaria y attachShadow fallaria.
const ID_SCRIPT = 'oven-chat-widget-loader';

// Host que el propio widget crea en <body> y sobre el que monta su shadow root.
const ID_HOST = 'oven-chat-widget';

/**
 * Monta el widget de chat agentico de Oven inyectando su script IIFE con los
 * atributos data-* que espera el embed. Al desmontar se retira el script y los
 * nodos que el widget agrega directamente a <body>, para que el burbuja no quede
 * flotando cuando el usuario sale de la pagina de Recomendaciones.
 */
export function OvenChatWidget() {
  useEffect(() => {
    const configuracion = obtenerConfiguracionWidgetOven();
    if (!configuracion.habilitado || !configuracion.src) return;
    if (document.getElementById(ID_SCRIPT)) return;

    // Si quedo un host de un montaje anterior, se retira antes de volver a cargar el script.
    document.getElementById(ID_HOST)?.remove();

    const nodosDelWidget: Element[] = [];
    const observador = new MutationObserver((mutaciones) => {
      for (const mutacion of mutaciones) {
        mutacion.addedNodes.forEach((nodo) => {
          if (nodo instanceof Element && nodo.id !== 'root' && nodo.id !== ID_SCRIPT) {
            nodosDelWidget.push(nodo);
          }
        });
      }
    });
    observador.observe(document.body, { childList: true });

    const script = document.createElement('script');
    script.id = ID_SCRIPT;
    script.src = configuracion.src;
    script.async = true;
    script.dataset.api = configuracion.apiUrl;
    script.dataset.embedKey = configuracion.embedKey;
    script.dataset.tenant = configuracion.tenant;
    script.dataset.agent = configuracion.agent;
    script.dataset.theme = configuracion.theme;
    script.dataset.visualStyle = configuracion.visualStyle;
    script.dataset.position = configuracion.position;
    script.onerror = () => {
      console.warn(`[OvenChatWidget] No se pudo cargar el widget desde ${configuracion.src}`);
    };
    document.body.appendChild(script);

    // Ajustes sobre la UI del widget que su embed no permite configurar.
    const detenerPersonalizacion = personalizarWidgetOven(ID_HOST, {
      textoEntrada: configuracion.textoEntrada,
      ocultarAccionesRapidas: configuracion.ocultarAccionesRapidas,
      preguntasIniciales: configuracion.preguntasIniciales
    });

    return () => {
      detenerPersonalizacion();
      observador.disconnect();
      nodosDelWidget.forEach((nodo) => nodo.remove());
      script.remove();
    };
  }, []);

  return null;
}

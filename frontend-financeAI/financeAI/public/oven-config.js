/**
 * Configuracion del widget de chat agentico resuelta en tiempo de ejecucion.
 *
 * Este archivo es un marcador de posicion para el modo desarrollo (vite dev), donde la
 * configuracion se toma de las variables VITE_OVEN_* del archivo .env.
 * En Docker, docker/entrypoint.sh lo regenera al arrancar el contenedor a partir de las
 * variables de entorno OVEN_*, de modo que no hace falta reconstruir la imagen para
 * cambiar la API, el tenant o el agente.
 */
window.__OVEN_CONFIG__ = window.__OVEN_CONFIG__ || {};

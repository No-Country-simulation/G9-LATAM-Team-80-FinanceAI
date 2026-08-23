import { COLUMNAS_REQUERIDAS } from './csv';

export const NOMBRE_PLANTILLA = 'plantilla_transacciones_financeai.csv';

/**
 * Filas de ejemplo. Se escriben sin tildes a proposito: el archivo se abre en Excel,
 * Sheets y editores de texto de medio equipo, y los acentos son justo lo que se rompe
 * cuando alguno de ellos decide reinterpretar la codificacion. Los nombres de columna
 * tampoco llevan tilde porque son contrato del lector.
 *
 * No incluye la columna categoria: en los gastos la resuelve FinanceAI y en ingresos y
 * ahorros no corresponde. Pedirla en la plantilla obligaba a pensar en algo que la
 * aplicacion ya hace sola.
 */
const EJEMPLOS = [
  ['Mercado Exito', 'gasto', '2026-08-20', '250000'],
  ['Gasolina', 'gasto', '2026-08-21', '120000'],
  ['Nomina agosto', 'ingreso', '2026-08-15', '5000000'],
  ['Fondo de emergencia', 'ahorro', '2026-08-16', '500000']
];

/**
 * Contenido de la plantilla.
 *
 * Se genera desde COLUMNAS_REQUERIDAS para que no pueda quedar desfasada del lector:
 * si algun dia cambia el contrato, la plantilla cambia con el.
 *
 * Separadores CRLF y BOM al inicio -- eso es lo que hace que Excel la abra como UTF-8
 * en vez de con la codificacion regional del equipo.
 */
export function contenidoPlantilla(): string {
  const lineas = [COLUMNAS_REQUERIDAS.join(','), ...EJEMPLOS.map((fila) => fila.join(','))];
  return '﻿' + lineas.join('\r\n') + '\r\n';
}

/** Descarga la plantilla como archivo. */
export function descargarPlantilla(): void {
  const blob = new Blob([contenidoPlantilla()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = NOMBRE_PLANTILLA;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Sin esto el blob queda retenido en memoria mientras viva la pestaña.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

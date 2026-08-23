import {
  ChartDonut,
  ClockCounterClockwise,
  FileArrowUp,
  House,
  Lightbulb,
  Receipt,
  Wallet
} from '@phosphor-icons/react';
import type { RutaAplicacion } from '../../compartido/tipos/rutas';

/**
 * Navegacion lateral.
 *
 * Las etiquetas son solo lo que se ve: "Historial de analisis" e "Archivos CSV" se
 * acortaron a "Historial" e "Importar CSV", pero los ids siguen siendo los mismos y
 * ninguna otra parte de la app cambia.
 *
 * Configuracion no esta aca a proposito: se llega desde el menu de usuario del header.
 * Tenerla tambien en el lateral duplicaba el acceso y obligaba a un pie artificial que
 * estiraba el sidebar. La vista, su id y su ruta siguen existiendo.
 */
export const rutasAplicacion: RutaAplicacion[] = [
  { id: 'tablero', etiqueta: 'Dashboard', icono: House, grupo: 'general' },
  { id: 'presupuestos', etiqueta: 'Presupuesto', icono: Wallet, grupo: 'general' },
  { id: 'transacciones', etiqueta: 'Transacciones', icono: Receipt, grupo: 'general' },
  { id: 'analisis', etiqueta: 'Análisis', icono: ChartDonut, grupo: 'general' },
  { id: 'recomendaciones', etiqueta: 'Recomendaciones', icono: Lightbulb, grupo: 'general' },
  { id: 'historial', etiqueta: 'Historial', icono: ClockCounterClockwise, grupo: 'general' },
  { id: 'archivos', etiqueta: 'Importar CSV', icono: FileArrowUp, grupo: 'datos' }
];

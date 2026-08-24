import {
  ChartDonut,
  House,
  Lightbulb,
  Receipt,
  Wallet
} from '@phosphor-icons/react';
import type { RutaAplicacion } from '../../compartido/tipos/rutas';

/**
 * Navegacion lateral.
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
  { id: 'recomendaciones', etiqueta: 'Recomendaciones', icono: Lightbulb, grupo: 'general' }
];

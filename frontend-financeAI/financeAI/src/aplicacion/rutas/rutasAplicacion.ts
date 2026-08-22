import {
  ChartPieSlice,
  ClockCounterClockwise,
  FileArrowUp,
  GearSix,
  House,
  Lightbulb,
  Receipt,
  Wallet
} from '@phosphor-icons/react';
import type { RutaAplicacion } from '../../compartido/tipos/rutas';

export const rutasAplicacion: RutaAplicacion[] = [
  { id: 'tablero', etiqueta: 'Dashboard', icono: House },
  { id: 'presupuestos', etiqueta: 'Presupuesto', icono: Wallet },
  { id: 'transacciones', etiqueta: 'Transacciones', icono: Receipt },
  { id: 'analisis', etiqueta: 'Analisis', icono: ChartPieSlice },
  { id: 'recomendaciones', etiqueta: 'Recomendaciones', icono: Lightbulb },
  { id: 'historial', etiqueta: 'Historial de analisis', icono: ClockCounterClockwise },
  { id: 'archivos', etiqueta: 'Archivos CSV', icono: FileArrowUp },
  { id: 'configuracion', etiqueta: 'Configuracion', icono: GearSix }
];

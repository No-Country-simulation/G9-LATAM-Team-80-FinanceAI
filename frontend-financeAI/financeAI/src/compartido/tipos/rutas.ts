import type { Icon } from '@phosphor-icons/react';

export type RutaId =
  | 'tablero'
  | 'transacciones'
  | 'analisis'
  | 'presupuestos'
  | 'recomendaciones'
  | 'historial'
  | 'configuracion'
  | 'archivos';

export type RutaAplicacion = {
  id: RutaId;
  etiqueta: string;
  icono: Icon;
};

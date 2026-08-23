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

/** Grupos del sidebar. Solo agrupan visualmente: no afectan a la navegacion. */
export type GrupoRuta = 'general' | 'datos';

export type RutaAplicacion = {
  id: RutaId;
  etiqueta: string;
  icono: Icon;
  grupo: GrupoRuta;
};

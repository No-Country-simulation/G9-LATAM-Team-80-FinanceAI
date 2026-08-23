export type TipoTransaccion = 'ingreso' | 'gasto' | 'ahorro';

export type CategoriaFinanciera =
  | 'profesionales'
  | 'mascotas'
  | 'alimentacion'
  | 'transporte'
  | 'salud'
  | 'educacion'
  | 'entretenimiento'
  | 'deudas'
  | 'impuestos_y_seguros'
  | 'cuidado_personal'
  | 'vivienda'
  | 'otros';

export type PerfilFinanciero = 'Saludable' | 'En observacion' | 'En riesgo';

export type Transaccion = {
  id: string;
  descripcion: string;
  /**
   * Solo los gastos tienen categoria. Las doce del catalogo son categorias de gasto,
   * asi que ingresos y ahorros llevan null en vez de un valor de relleno.
   */
  categoria: CategoriaFinanciera | null;
  tipo: TipoTransaccion;
  fecha: string;
  monto: number;
};

export type PresupuestoCategoria = {
  categoria: CategoriaFinanciera;
  presupuesto: number;
  gastado: number;
};

export type Recomendacion = {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  tipo: 'gastos' | 'ahorro' | 'deudas' | 'ingresos';
};

export type ClasificacionTransaccion = {
  descripcion: string;
  valor: number;
  categoria: CategoriaFinanciera;
};

export type ResultadoAnalisis = {
  ingresoMensual: number;
  gastoTotalMes: number;
  ahorroTotal: number;
  perfilFinanciero: PerfilFinanciero;
  probabilidad: number;
  tasaAhorro: number;
  ratioGastoIngreso: number;
  nivelEndeudamiento: number;
  gastosRecurrentes: number;
  razonesPerfil: string[];
  clasificaciones: ClasificacionTransaccion[];
  resumenGastos: Record<CategoriaFinanciera, number>;
  recomendaciones: Recomendacion[];
};

export type HistorialAnalisis = {
  id: number;
  fecha: string;
  ingresoMensual: number;
  nivelEndeudamiento: number;
  frecuenciaAhorro: 'Alta' | 'Media' | 'Baja';
  perfilFinanciero: PerfilFinanciero;
  probabilidad: number;
  gastoTotalMes: number;
  ahorroTotal: number;
};

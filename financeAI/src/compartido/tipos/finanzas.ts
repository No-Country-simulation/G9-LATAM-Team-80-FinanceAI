export type TipoTransaccion = 'ingreso' | 'gasto' | 'ahorro';

export type CategoriaFinanciera =
  | 'alimentacion'
  | 'transporte'
  | 'vivienda'
  | 'servicios'
  | 'entretenimiento'
  | 'salud'
  | 'educacion'
  | 'ahorro'
  | 'otros';

export type PerfilFinanciero = 'Saludable' | 'En observacion' | 'En riesgo';

export type Transaccion = {
  id: string;
  descripcion: string;
  categoria: CategoriaFinanciera;
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

export type ResultadoAnalisis = {
  perfilFinanciero: PerfilFinanciero;
  probabilidad: number;
  tasaAhorro: number;
  ratioGastoIngreso: number;
  nivelEndeudamiento: number;
  gastosRecurrentes: number;
  resumenGastos: Record<CategoriaFinanciera, number>;
  recomendaciones: Recomendacion[];
};

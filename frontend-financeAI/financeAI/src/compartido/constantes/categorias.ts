import type { CategoriaFinanciera } from '../tipos/finanzas';

export const etiquetasCategoria: Record<CategoriaFinanciera, string> = {
  profesionales: 'Gastos profesionales',
  mascotas: 'Mascotas',
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  vivienda: 'Vivienda',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  educacion: 'Educación',
  deudas: 'Deudas',
  impuestos_y_seguros: 'Impuestos y seguros',
  cuidado_personal: 'Cuidado personal',
  otros: 'Otros'
};

export const coloresCategoria: Record<CategoriaFinanciera, string> = {
  profesionales: '#475569',
  mascotas: '#a855f7',
  alimentacion: '#2563eb',
  transporte: '#f97316',
  vivienda: '#22c55e',
  entretenimiento: '#d946ef',
  salud: '#0ea5e9',
  educacion: '#3b82f6',
  deudas: '#dc2626',
  impuestos_y_seguros: '#64748b',
  cuidado_personal: '#ec4899',
  otros: '#94a3b8'
};

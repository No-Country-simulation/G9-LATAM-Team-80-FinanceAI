import type { CategoriaFinanciera } from '../tipos/finanzas';

export const etiquetasCategoria: Record<CategoriaFinanciera, string> = {
  alimentacion: 'Alimentacion',
  transporte: 'Transporte',
  vivienda: 'Vivienda',
  servicios: 'Servicios',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  educacion: 'Educacion',
  ahorro: 'Ahorro',
  otros: 'Otros'
};

export const coloresCategoria: Record<CategoriaFinanciera, string> = {
  alimentacion: '#2563eb',
  transporte: '#f97316',
  vivienda: '#22c55e',
  servicios: '#7048e8',
  entretenimiento: '#d946ef',
  salud: '#0ea5e9',
  educacion: '#3b82f6',
  ahorro: '#16a34a',
  otros: '#94a3b8'
};

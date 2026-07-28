import type { PresupuestoCategoria, Transaccion } from '../tipos/finanzas';

export const transaccionesIniciales: Transaccion[] = [
  { id: 't-1', descripcion: 'Supermercado Wong', categoria: 'alimentacion', tipo: 'gasto', fecha: '31 May 2025', monto: -120.5 },
  { id: 't-2', descripcion: 'Combustible Repsol', categoria: 'transporte', tipo: 'gasto', fecha: '30 May 2025', monto: -80 },
  { id: 't-3', descripcion: 'Netflix', categoria: 'entretenimiento', tipo: 'gasto', fecha: '28 May 2025', monto: -40 },
  { id: 't-4', descripcion: 'Sueldo', categoria: 'otros', tipo: 'ingreso', fecha: '25 May 2025', monto: 4500 },
  { id: 't-5', descripcion: 'Luz del Sur', categoria: 'servicios', tipo: 'gasto', fecha: '23 May 2025', monto: -150 },
  { id: 't-6', descripcion: 'Alquiler', categoria: 'vivienda', tipo: 'gasto', fecha: '20 May 2025', monto: -930 },
  { id: 't-7', descripcion: 'Farmacia Inkafarma', categoria: 'salud', tipo: 'gasto', fecha: '18 May 2025', monto: -60 },
  { id: 't-8', descripcion: 'Universidad', categoria: 'educacion', tipo: 'gasto', fecha: '15 May 2025', monto: -320 },
  { id: 't-9', descripcion: 'Transferencia a ahorro', categoria: 'ahorro', tipo: 'ahorro', fecha: '10 May 2025', monto: -200 },
  { id: 't-10', descripcion: 'Cena', categoria: 'entretenimiento', tipo: 'gasto', fecha: '08 May 2025', monto: -35 }
];

export const presupuestosIniciales: PresupuestoCategoria[] = [
  { categoria: 'alimentacion', presupuesto: 1400, gastado: 1120 },
  { categoria: 'transporte', presupuesto: 900, gastado: 750 },
  { categoria: 'vivienda', presupuesto: 800, gastado: 600 },
  { categoria: 'servicios', presupuesto: 500, gastado: 300 },
  { categoria: 'entretenimiento', presupuesto: 300, gastado: 140 },
  { categoria: 'otros', presupuesto: 100, gastado: 40 }
];

export const evolucionMensual = [
  { mes: 'Dic 2024', gastos: 2200, ahorros: 650 },
  { mes: 'Ene 2025', gastos: 3120, ahorros: 1180 },
  { mes: 'Feb 2025', gastos: 2740, ahorros: 620 },
  { mes: 'Mar 2025', gastos: 3460, ahorros: 1090 },
  { mes: 'Abr 2025', gastos: 3150, ahorros: 780 },
  { mes: 'May 2025', gastos: 2950, ahorros: 1250 }
];

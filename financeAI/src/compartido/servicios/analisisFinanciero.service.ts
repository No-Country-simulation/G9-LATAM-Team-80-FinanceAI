import type { CategoriaFinanciera, Recomendacion, ResultadoAnalisis, Transaccion } from '../tipos/finanzas';

const categorias: CategoriaFinanciera[] = [
  'alimentacion',
  'transporte',
  'vivienda',
  'servicios',
  'entretenimiento',
  'salud',
  'educacion',
  'ahorro',
  'otros'
];

export function generarAnalisisFinanciero(transacciones: Transaccion[]): ResultadoAnalisis {
  const ingresoMensual = transacciones
    .filter((transaccion) => transaccion.tipo === 'ingreso')
    .reduce((total, transaccion) => total + transaccion.monto, 0);

  const gastoTotal = Math.abs(
    transacciones
      .filter((transaccion) => transaccion.tipo === 'gasto')
      .reduce((total, transaccion) => total + transaccion.monto, 0)
  );

  const ahorroTotal = Math.abs(
    transacciones
      .filter((transaccion) => transaccion.tipo === 'ahorro')
      .reduce((total, transaccion) => total + transaccion.monto, 0)
  );

  const resumenGastos = categorias.reduce(
    (resumen, categoria) => ({ ...resumen, [categoria]: 0 }),
    {} as Record<CategoriaFinanciera, number>
  );

  transacciones
    .filter((transaccion) => transaccion.tipo === 'gasto')
    .forEach((transaccion) => {
      resumenGastos[transaccion.categoria] += Math.abs(transaccion.monto);
    });

  const tasaAhorro = ingresoMensual ? (ahorroTotal / ingresoMensual) * 100 : 0;
  const ratioGastoIngreso = ingresoMensual ? (gastoTotal / ingresoMensual) * 100 : 0;
  const nivelEndeudamiento = 25;
  const probabilidad = ratioGastoIngreso > 70 || tasaAhorro < 10 ? 0.82 : 0.91;
  const perfilFinanciero = probabilidad >= 0.9 ? 'Saludable' : probabilidad >= 0.68 ? 'En observacion' : 'En riesgo';

  const recomendaciones: Recomendacion[] = [
    {
      id: 'r-1',
      titulo: 'Reduce los gastos en entretenimiento',
      descripcion: 'Estas gastando 25% mas de lo recomendado en esta categoria.',
      prioridad: 'Media',
      tipo: 'gastos'
    },
    {
      id: 'r-2',
      titulo: 'Aumenta tu ahorro mensual',
      descripcion: 'Intenta ahorrar al menos el 10% de tus ingresos.',
      prioridad: tasaAhorro < 10 ? 'Alta' : 'Media',
      tipo: 'ahorro'
    },
    {
      id: 'r-3',
      titulo: 'Revisa tus gastos recurrentes',
      descripcion: 'Tienes servicios y suscripciones que podrias optimizar.',
      prioridad: 'Media',
      tipo: 'gastos'
    },
    {
      id: 'r-4',
      titulo: 'Controla los gastos de transporte',
      descripcion: 'Tus gastos en transporte estan cerca del limite recomendado.',
      prioridad: 'Baja',
      tipo: 'gastos'
    }
  ];

  return {
    perfilFinanciero,
    probabilidad,
    tasaAhorro,
    ratioGastoIngreso,
    nivelEndeudamiento,
    gastosRecurrentes: 1240,
    resumenGastos,
    recomendaciones
  };
}

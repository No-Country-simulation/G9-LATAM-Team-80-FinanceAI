import type {
  CategoriaFinanciera,
  ClasificacionTransaccion,
  PerfilFinanciero,
  Recomendacion,
  ResultadoAnalisis,
  Transaccion
} from '../tipos/finanzas';

const API_URL = import.meta.env.VITE_API_URL ?? '';

type AnalisisApiResponse = {
  ingreso_mensual: number;
  gasto_total_mes: number;
  ahorro_total: number;
  perfil_financiero: PerfilFinanciero;
  probabilidad: number;
  razones: string[];
  metricas: {
    ratio_gasto_ingreso: number;
    nivel_endeudamiento: number;
    frecuencia_ahorro: 'Alta' | 'Media' | 'Baja';
    ahorro_estimado_pct: number;
  };
  resumen_gastos: Partial<Record<CategoriaFinanciera, number>>;
  clasificaciones: ClasificacionTransaccion[];
  recomendaciones: string[];
};

export const categoriasFinancieras: CategoriaFinanciera[] = [
  'profesionales', 'mascotas', 'alimentacion', 'transporte', 'salud',
  'educacion', 'entretenimiento', 'deudas', 'impuestos_y_seguros',
  'cuidado_personal', 'vivienda', 'otros'
];

/**
 * El perfil financiero trata la deuda como una dimension aparte del gasto: el ML excluye
 * la categoria 'deudas' de gasto_total_mes para no contarla dos veces con
 * nivel_endeudamiento. Las vistas que muestran "gasto total" tienen que usar la misma
 * definicion; si suman resumenGastos completo, la misma pantalla termina mostrando dos
 * cifras de gasto distintas (la tarjeta y la que sostiene el perfil).
 *
 * Devuelve el resumen sin deudas y su total, para que tarjeta, donut y tabla coincidan.
 */
export function gastosSinDeudas(resumen: Record<CategoriaFinanciera, number>) {
  const entradas = (Object.entries(resumen) as [CategoriaFinanciera, number][])
    .filter(([categoria]) => categoria !== 'deudas');

  return {
    resumen: Object.fromEntries(entradas) as Record<CategoriaFinanciera, number>,
    total: entradas.reduce((suma, [, valor]) => suma + valor, 0)
  };
}

export const analisisInicial: ResultadoAnalisis = {
  ingresoMensual: 0,
  gastoTotalMes: 0,
  ahorroTotal: 0,
  perfilFinanciero: 'Saludable',
  probabilidad: 0,
  tasaAhorro: 0,
  ratioGastoIngreso: 0,
  nivelEndeudamiento: 0,
  gastosRecurrentes: 0,
  razonesPerfil: [],
  clasificaciones: [],
  resumenGastos: Object.fromEntries(categoriasFinancieras.map((categoria) => [categoria, 0])) as Record<CategoriaFinanciera, number>,
  recomendaciones: []
};

export async function solicitarAnalisisFinanciero(
  token: string,
  transacciones: Transaccion[],
  ingresoMensual: number,
  nivelEndeudamiento: number,
  frecuenciaAhorro: 'Alta' | 'Media' | 'Baja',
  signal?: AbortSignal
): Promise<ResultadoAnalisis> {
  const response = await fetch(`${API_URL}/api/analisis-financiero`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    signal,
    body: JSON.stringify({
      ingreso_mensual: ingresoMensual,
      nivel_endeudamiento: nivelEndeudamiento,
      frecuencia_ahorro: frecuenciaAhorro,
      transacciones: transacciones.map((transaccion) => ({
        descripcion: transaccion.descripcion,
        valor: Math.abs(transaccion.monto),
        tipo: transaccion.tipo
      }))
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { mensaje?: string; detail?: string } | null;
    throw new Error(error?.mensaje ?? error?.detail ?? 'No fue posible generar el análisis financiero.');
  }

  return transformarRespuesta(await response.json() as AnalisisApiResponse);
}

function transformarRespuesta(data: AnalisisApiResponse): ResultadoAnalisis {
  const resumenGastos = Object.fromEntries(
    categoriasFinancieras.map((categoria) => [categoria, data.resumen_gastos[categoria] ?? 0])
  ) as Record<CategoriaFinanciera, number>;
  const tasaAhorro = data.ingreso_mensual ? (data.ahorro_total / data.ingreso_mensual) * 100 : 0;

  return {
    ingresoMensual: data.ingreso_mensual,
    gastoTotalMes: data.gasto_total_mes,
    ahorroTotal: data.ahorro_total,
    perfilFinanciero: data.perfil_financiero,
    probabilidad: data.probabilidad,
    tasaAhorro,
    ratioGastoIngreso: data.metricas.ratio_gasto_ingreso * 100,
    nivelEndeudamiento: data.metricas.nivel_endeudamiento,
    gastosRecurrentes: resumenGastos.vivienda,
    razonesPerfil: data.razones,
    clasificaciones: data.clasificaciones,
    resumenGastos,
    recomendaciones: data.recomendaciones.map(convertirRecomendacion)
  };
}

function convertirRecomendacion(texto: string, index: number): Recomendacion {
  const normalizada = texto.toLowerCase();
  const tipo: Recomendacion['tipo'] = normalizada.includes('deuda')
    ? 'deudas'
    : normalizada.includes('ahorr') || normalizada.includes('colchon')
      ? 'ahorro'
      : 'gastos';
  const prioridad: Recomendacion['prioridad'] = normalizada.startsWith('alerta') || normalizada.includes('requiere atencion')
    ? 'Alta'
    : normalizada.includes('por encima') ? 'Media' : 'Baja';
  const titulo = texto.split(':')[0].replace(/[.]$/, '') || 'Recomendación financiera';

  return { id: `r-${index + 1}`, titulo, descripcion: texto, prioridad, tipo };
}

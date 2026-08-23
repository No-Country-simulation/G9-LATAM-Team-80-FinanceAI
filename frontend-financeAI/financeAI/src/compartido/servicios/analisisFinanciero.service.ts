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

/**
 * Pagos de deuda del periodo, en pesos.
 *
 * Sale SIEMPRE de resumenGastos.deudas, que es la suma real de los movimientos que el
 * clasificador puso en esa categoria. No se deriva de nivelEndeudamiento: ese es un
 * porcentaje del ingreso calculado aparte, y multiplicarlo por el ingreso daria un
 * numero parecido pero inventado. Son dos cosas distintas -- cuanto se debe frente a
 * cuanto se pago -- y no deben confundirse.
 */
export function pagosDeDeuda(analisis: ResultadoAnalisis): number {
  return analisis.resumenGastos.deudas;
}

/**
 * El gasto tal como lo entiende una persona: todo lo que salio de la cuenta.
 *
 * gastoTotalMes deja fuera la categoria "deudas" -- el ML la excluye para no duplicarla
 * con nivelEndeudamiento --, asi que por si solo no responde "cuanto gaste". Sumar las
 * dos partes no duplica nada: son disjuntas por construccion.
 */
export function gastosVisibles(analisis: ResultadoAnalisis): number {
  return analisis.gastoTotalMes + pagosDeDeuda(analisis);
}

/**
 * Que porcentaje del ingreso se fue en gasto, contando la deuda.
 *
 * No se reutiliza ratioGastoIngreso del analisis porque ese mide gastoTotalMes, o sea
 * el gasto SIN deuda. Mostrarlo debajo de una cifra que si la incluye seria un pie que
 * no corresponde al numero que tiene encima.
 */
export function ratioGastoVisible(analisis: ResultadoAnalisis): number {
  if (analisis.ingresoMensual <= 0) return 0;
  return (gastosVisibles(analisis) / analisis.ingresoMensual) * 100;
}

/**
 * Flujo real que queda del periodo: lo que entro menos todo lo que salio.
 *
 *     Ingresos - gastoTotalMes - resumenGastos.deudas - ahorroTotal
 *
 * Los cuatro terminos son disjuntos, asi que no hay doble conteo:
 *
 *   - gasto y ahorro son tipos de movimiento distintos, y el ML los separa por tipo:
 *         gastos       = [item for item in transacciones if item.tipo == "gasto"]
 *         ahorro_total = sum(item.valor for item in transacciones if item.tipo == "ahorro")
 *   - gastoTotalMes suma los gastos EXCLUYENDO la categoria "deudas" -- el ML la deja
 *     fuera para no duplicarla con nivelEndeudamiento --, de modo que sumarle
 *     resumenGastos.deudas completa el gasto del periodo sin repetir ningun peso.
 *
 * Las cuatro tarjetas cuadran a la vista porque la de Gastos muestra gastosVisibles,
 * que ya incluye la deuda. Antes mostraba gastoTotalMes y la resta no daba.
 *
 * Vive aqui y no en la vista porque es aritmetica financiera, y porque el dia que
 * cambie tiene que cambiar en un solo sitio.
 */
export function calcularDisponible(analisis: ResultadoAnalisis): number {
  return analisis.ingresoMensual - gastosVisibles(analisis) - analisis.ahorroTotal;
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

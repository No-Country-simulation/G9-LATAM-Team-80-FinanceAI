import { etiquetasCategoria } from '../constantes/categorias';
import type { CategoriaFinanciera, HistorialAnalisis, PresupuestoCategoria, TipoTransaccion, Transaccion } from '../tipos/finanzas';
import { apiRequest } from './api.service';

type TransaccionApi = { id: number; descripcion: string; categoria: CategoriaFinanciera | null; tipo: TipoTransaccion; fecha: string; monto: number };
type PresupuestoApi = { id: number; categoria: CategoriaFinanciera; presupuesto: number; gastado: number };

function aTransaccion(item: TransaccionApi): Transaccion {
  return { ...item, id: String(item.id), monto: item.tipo === 'ingreso' ? Math.abs(item.monto) : -Math.abs(item.monto) };
}
function payload(item: Omit<Transaccion, 'id'>) {
  return { descripcion: item.descripcion, categoria: item.categoria, tipo: item.tipo, fecha: item.fecha, monto: Math.abs(item.monto) };
}

export async function listarTransacciones(token: string) {
  return (await apiRequest<TransaccionApi[]>('/api/transacciones', token)).map(aTransaccion);
}
export async function crearTransaccion(token: string, item: Omit<Transaccion, 'id'>) {
  return aTransaccion(await apiRequest<TransaccionApi>('/api/transacciones', token, { method: 'POST', body: JSON.stringify(payload(item)) }));
}
export async function actualizarTransaccion(token: string, id: string, item: Omit<Transaccion, 'id'>) {
  return aTransaccion(await apiRequest<TransaccionApi>(`/api/transacciones/${id}`, token, { method: 'PUT', body: JSON.stringify(payload(item)) }));
}
export function eliminarTransaccion(token: string, id: string) {
  return apiRequest<void>(`/api/transacciones/${id}`, token, { method: 'DELETE' });
}
export async function importarTransacciones(token: string, items: Omit<Transaccion, 'id'>[]) {
  return (await apiRequest<TransaccionApi[]>('/api/transacciones/importar', token, {
    method: 'POST', body: JSON.stringify({ transacciones: items.map(payload) })
  })).map(aTransaccion);
}
/**
 * Categorias de un lote de descripciones, segun el clasificador real.
 *
 * Reutiliza POST /api/clasificar-transacciones, que ya existe y ya usa el analisis: el
 * backend lo reenvia al servicio ML. Se manda UNA sola peticion con todo el lote. El
 * costo medido es casi plano -- 1 fila 11 ms, 300 filas 56 ms -- porque lo caro es la
 * llamada, no la fila. Una peticion por transaccion ademas arriesga abrir el
 * cortacircuitos a mitad de una importacion.
 *
 * El clasificador es de GASTOS: sus doce categorias son categorias de gasto y ni
 * siquiera recibe el tipo. No debe llamarse para ingresos ni ahorros.
 *
 * Se valida el contrato antes de devolver nada: misma cantidad que se envio y cada
 * etiqueta dentro del catalogo. Si no cuadra, es preferible fallar que devolver
 * categorias desalineadas que terminarian guardadas en la fila equivocada.
 */
export async function clasificarDescripciones(
  token: string,
  items: { descripcion: string; valor: number }[]
): Promise<CategoriaFinanciera[]> {
  if (items.length === 0) return [];

  const respuesta = await apiRequest<{ clasificaciones?: { descripcion?: string; categoria?: string }[] }>(
    '/api/clasificar-transacciones',
    token,
    { method: 'POST', body: JSON.stringify({ transacciones: items }) }
  );

  const clasificaciones = respuesta.clasificaciones ?? [];
  if (clasificaciones.length !== items.length) {
    throw new Error('El clasificador devolvio una cantidad de resultados distinta a la enviada.');
  }

  return clasificaciones.map((item, indice) => {
    const categoria = item.categoria;
    if (!categoria || !(categoria in etiquetasCategoria)) {
      throw new Error(`El clasificador devolvio una categoria desconocida en la posicion ${indice + 1}.`);
    }
    return categoria as CategoriaFinanciera;
  });
}

/** Categoria de una sola descripcion de gasto. Se apoya en el lote de un elemento. */
export async function clasificarDescripcion(token: string, descripcion: string, valor: number): Promise<CategoriaFinanciera> {
  const [categoria] = await clasificarDescripciones(token, [{ descripcion, valor }]);
  if (!categoria) throw new Error('El clasificador no devolvio una categoria valida.');
  return categoria;
}

/*
 * El limite es por categoria y no tiene periodo; el gasto contra el que se compara si.
 * Sin el parametro el backend devuelve el del mes mas reciente con movimientos, que es
 * lo que hacia antes: la pantalla mostraba ese consumo aunque estuvieras mirando otro
 * mes en el selector.
 */
function conMes(ruta: string, mes?: string | null) {
  return mes ? `${ruta}?mes=${encodeURIComponent(mes)}` : ruta;
}

export async function listarPresupuestos(token: string, mes?: string | null): Promise<PresupuestoCategoria[]> {
  const items = await apiRequest<PresupuestoApi[]>(conMes('/api/presupuestos', mes), token);
  return items.map(({ categoria, presupuesto, gastado }) => ({ categoria, presupuesto, gastado }));
}
export async function guardarPresupuesto(token: string, categoria: CategoriaFinanciera, presupuesto: number, mes?: string | null) {
  const item = await apiRequest<PresupuestoApi>(conMes('/api/presupuestos', mes), token, { method: 'PUT', body: JSON.stringify({ categoria, presupuesto }) });
  return { categoria: item.categoria, presupuesto: item.presupuesto, gastado: item.gastado } satisfies PresupuestoCategoria;
}

/**
 * Varios limites del mismo periodo en UNA peticion.
 *
 * Una llamada por categoria dejaba el mes a medias si fallaba la sexta. El backend lo
 * resuelve en una transaccion: o entran todos o no entra ninguno.
 */
export async function guardarPresupuestos(
  token: string,
  limites: { categoria: CategoriaFinanciera; presupuesto: number }[],
  mes?: string | null
): Promise<PresupuestoCategoria[]> {
  const items = await apiRequest<PresupuestoApi[]>(conMes('/api/presupuestos/lote', mes), token, {
    method: 'PUT',
    body: JSON.stringify({ limites })
  });
  return items.map(({ categoria, presupuesto, gastado }) => ({ categoria, presupuesto, gastado }));
}
/**
 * Quita el limite de una categoria en el periodo indicado.
 *
 * No es un PUT con presupuesto vacio o en 0: el backend nunca acepta eso (el limite
 * siempre es > 0), asi que "sin limite" solo se puede pedir con un DELETE real.
 */
export function eliminarPresupuesto(token: string, categoria: CategoriaFinanciera, mes?: string | null) {
  const parametros = new URLSearchParams({ categoria });
  if (mes) parametros.set('mes', mes);
  return apiRequest<void>(`/api/presupuestos?${parametros.toString()}`, token, { method: 'DELETE' });
}

export function listarHistorial(token: string) {
  return apiRequest<HistorialAnalisis[]>('/api/historial', token);
}
export function eliminarAnalisis(token: string, id: number) {
  return apiRequest<void>(`/api/historial/${id}`, token, { method: 'DELETE' });
}


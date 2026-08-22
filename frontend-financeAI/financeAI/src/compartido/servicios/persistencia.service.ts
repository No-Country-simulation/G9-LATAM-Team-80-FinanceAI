import type { CategoriaFinanciera, HistorialAnalisis, PresupuestoCategoria, TipoTransaccion, Transaccion } from '../tipos/finanzas';
import { apiRequest } from './api.service';

type TransaccionApi = { id: number; descripcion: string; categoria: CategoriaFinanciera; tipo: TipoTransaccion; fecha: string; monto: number };
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
export async function listarPresupuestos(token: string): Promise<PresupuestoCategoria[]> {
  return (await apiRequest<PresupuestoApi[]>('/api/presupuestos', token)).map(({ categoria, presupuesto, gastado }) => ({ categoria, presupuesto, gastado }));
}
export async function guardarPresupuesto(token: string, categoria: CategoriaFinanciera, presupuesto: number) {
  const item = await apiRequest<PresupuestoApi>('/api/presupuestos', token, { method: 'PUT', body: JSON.stringify({ categoria, presupuesto }) });
  return { categoria: item.categoria, presupuesto: item.presupuesto, gastado: item.gastado } satisfies PresupuestoCategoria;
}
export function listarHistorial(token: string) {
  return apiRequest<HistorialAnalisis[]>('/api/historial', token);
}
export function eliminarAnalisis(token: string, id: number) {
  return apiRequest<void>(`/api/historial/${id}`, token, { method: 'DELETE' });
}


import { etiquetasCategoria } from '../constantes/categorias';
import type { CategoriaFinanciera, Transaccion } from '../tipos/finanzas';
import type { FilaImportada } from './csv';

export type ClasificarLote = (items: { descripcion: string; valor: number }[]) => Promise<CategoriaFinanciera[]>;

/**
 * Completa las categorias que faltan y devuelve el conjunto listo para guardar.
 *
 * La operacion es todo o nada. La secuencia es deliberada:
 *
 *   leer -> validar estructura -> reunir gastos sin categoria -> clasificar en UN lote
 *        -> reasociar por indice -> validar el conjunto completo -> recien ahi importar
 *
 * Nunca se guarda una parte y despues se llama al modelo: si algo falla a mitad de
 * camino, en la cuenta no queda ni una fila a medio clasificar.
 *
 * Los ingresos y ahorros nunca llevan categoria: el lector del CSV descarta la que
 * traigan los archivos antiguos, porque las doce categorias describen gastos.
 */
export async function prepararImportacion(
  filas: FilaImportada[],
  clasificarLote: ClasificarLote
): Promise<Omit<Transaccion, 'id'>[]> {
  /*
    * Solo los GASTOS sin categoria van al modelo. Los ingresos y ahorros tambien
    * llegan con categoria en null, pero ahi el null es la respuesta definitiva: esos
    * movimientos no tienen categoria y mandarlos al clasificador de gastos les
    * inventaria una.
    */
  const pendientes = filas
    .map((fila, indice) => ({ fila, indice }))
    .filter((item) => item.fila.tipo === 'gasto' && item.fila.categoria === null);

  const categorias = pendientes.length > 0
    ? await clasificarLote(pendientes.map((item) => ({ descripcion: item.fila.descripcion, valor: Math.abs(item.fila.monto) })))
    : [];

  // El servicio ya valida cantidad y catalogo, pero esto es lo que impide guardar
  // categorias corridas de fila, asi que se comprueba tambien aqui.
  if (categorias.length !== pendientes.length) {
    throw new Error('El clasificador no devolvio una categoría para cada gasto.');
  }

  const resueltas = new Map<number, CategoriaFinanciera>();
  pendientes.forEach((item, posicion) => resueltas.set(item.indice, categorias[posicion]));

  const completas: Omit<Transaccion, 'id'>[] = filas.map((fila, indice) => ({
    descripcion: fila.descripcion,
    categoria: fila.tipo === 'gasto' ? (fila.categoria ?? resueltas.get(indice) ?? null) : null,
    tipo: fila.tipo,
    fecha: fila.fecha,
    monto: fila.monto
  }));

  /*
   * Ultima revision antes de persistir: todo gasto con una categoria del catalogo, y
   * ningun ingreso o ahorro con categoria.
   */
  const incoherente = completas.findIndex((fila) => fila.tipo === 'gasto'
    ? !fila.categoria || !(fila.categoria in etiquetasCategoria)
    : fila.categoria !== null);
  if (incoherente >= 0) {
    throw new Error(`No fue posible determinar la categoría de la fila ${incoherente + 2}.`);
  }

  return completas;
}

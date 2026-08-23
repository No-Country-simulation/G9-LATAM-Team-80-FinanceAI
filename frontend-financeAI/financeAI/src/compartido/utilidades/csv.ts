import { etiquetasCategoria } from '../constantes/categorias';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../tipos/finanzas';

/**
 * Fila leida del CSV.
 *
 * En un gasto, categoria en null significa "pendiente de clasificar". En un ingreso o
 * un ahorro significa lo definitivo: esos movimientos no tienen categoria.
 */
export type FilaImportada = Omit<Transaccion, 'id'>;

/** Una fila que no se pudo leer, con el motivo en lenguaje llano. */
export type ProblemaFila = { fila: number; motivo: string };

export type LecturaCsv = {
  filas: FilaImportada[];
  /** Filas de ingreso o ahorro que traian categoria y se leyeron sin ella. */
  categoriasDescartadas: number;
  /** Filas que necesitan revision. Si hay alguna, no se importa nada. */
  problemas: ProblemaFila[];
};

/**
 * Columnas del contrato. La categoria ya no se pide: en los gastos la resuelve
 * FinanceAI y en ingresos y ahorros no corresponde. Se sigue leyendo si viene, para
 * no romper los archivos anteriores al cambio.
 */
export const COLUMNAS_REQUERIDAS = ['descripcion', 'tipo', 'fecha', 'monto'];

const TIPOS: TipoTransaccion[] = ['ingreso', 'gasto', 'ahorro'];

/**
 * Tope de la columna monto: DECIMAL(15,2). Por encima, el backend responde 500 al
 * volcar la transaccion, asi que conviene frenarlo aqui y decirlo con claridad.
 */
const MONTO_MAXIMO = 9999999999999.99;

/**
 * Lector del CSV de movimientos.
 *
 * Los problemas se acumulan y se devuelven todos juntos: abortar en la primera fila
 * obligaba a corregir el archivo de a un error por intento.
 *
 * Un archivo antiguo puede traer categoria en un ingreso, porque hasta un tiempo atras
 * era obligatoria. Rechazarlo dejaria inservibles todos los CSV ya existentes por un
 * dato que de todos modos era de relleno, asi que se descarta el valor y se informa
 * cuantas filas quedaron afectadas.
 */
export function parsearCsv(texto: string): LecturaCsv {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((linea) => linea.trim());
  if (lineas.length < 2) throw new Error('El archivo no contiene movimientos.');

  const cabecera = lineas[0].split(',').map((valor) => valor.trim().toLowerCase());
  const faltantes = COLUMNAS_REQUERIDAS.filter((campo) => !cabecera.includes(campo));
  if (faltantes.length > 0) {
    throw new Error(
      `Al archivo le faltan columnas: ${faltantes.join(', ')}. La cabecera debe ser ${COLUMNAS_REQUERIDAS.join(',')}.`
    );
  }

  const problemas: ProblemaFila[] = [];
  const filas: FilaImportada[] = [];
  let categoriasDescartadas = 0;

  lineas.slice(1).forEach((linea, indice) => {
    const numeroDeFila = indice + 2; // +1 por la cabecera, +1 porque se cuenta desde uno
    const celdas = linea.split(',').map((valor) => valor.trim().replace(/^"|"$/g, ''));
    const valor = (campo: string) => (cabecera.includes(campo) ? celdas[cabecera.indexOf(campo)] ?? '' : '');

    const descripcion = valor('descripcion');
    const tipo = valor('tipo').toLowerCase() as TipoTransaccion;
    const fecha = valor('fecha');
    const bruto = valor('monto');
    const monto = Number(bruto);
    const categoriaCruda = valor('categoria');

    if (!descripcion) { problemas.push({ fila: numeroDeFila, motivo: 'Falta la descripción' }); return; }
    if (!TIPOS.includes(tipo)) { problemas.push({ fila: numeroDeFila, motivo: 'Tipo desconocido' }); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      problemas.push({ fila: numeroDeFila, motivo: 'Fecha no válida' });
      return;
    }
    if (!bruto || Number.isNaN(monto) || monto <= 0) {
      problemas.push({ fila: numeroDeFila, motivo: 'Monto no válido' });
      return;
    }
    if (monto > MONTO_MAXIMO) {
      // Se frena aqui: mas alla de este valor la columna no lo admite y el guardado
      // fallaria entero, llevandose por delante todas las demas filas del archivo.
      problemas.push({ fila: numeroDeFila, motivo: 'Monto demasiado grande' });
      return;
    }
    // Solo se valida el catalogo cuando la categoria va a usarse, o sea en un gasto.
    if (tipo === 'gasto' && categoriaCruda !== '' && !(categoriaCruda in etiquetasCategoria)) {
      problemas.push({ fila: numeroDeFila, motivo: `Categoría desconocida (${categoriaCruda})` });
      return;
    }
    if (tipo !== 'gasto' && categoriaCruda !== '') categoriasDescartadas += 1;

    filas.push({
      descripcion,
      tipo,
      fecha,
      monto,
      // Un gasto con categoria explicita la conserva: escribirla es una decision humana.
      categoria: tipo === 'gasto' && categoriaCruda !== '' ? (categoriaCruda as CategoriaFinanciera) : null
    });
  });

  if (filas.length === 0 && problemas.length === 0) {
    throw new Error('El archivo no contiene movimientos.');
  }
  return { filas, categoriasDescartadas, problemas };
}

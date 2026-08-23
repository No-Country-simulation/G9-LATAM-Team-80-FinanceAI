import { etiquetasCategoria } from '../constantes/categorias';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../tipos/finanzas';

/**
 * Lector del CSV de movimientos.
 *
 * Vivia dentro de TransactionsPage y FilesPage lo importaba desde ahi, o sea que una
 * pantalla dependia de otra solo para parsear texto. Al ser el mismo formato en los dos
 * puntos de importacion, el lector es codigo compartido y no de una pantalla.
 *
 * El comportamiento es identico al anterior: valida cabecera, categoria, tipo, formato
 * de fecha y monto, y aborta el archivo completo en la primera fila invalida.
 */
export function parsearCsv(texto: string): Omit<Transaccion, 'id'>[] {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((linea) => linea.trim());
  if (lineas.length < 2) throw new Error('El archivo no contiene transacciones.');

  const cabecera = lineas[0].split(',').map((valor) => valor.trim().toLowerCase());
  const requeridas = ['descripcion', 'categoria', 'tipo', 'fecha', 'monto'];
  if (requeridas.some((campo) => !cabecera.includes(campo))) {
    throw new Error(`Faltan columnas. Usa: ${requeridas.join(',')}`);
  }

  return lineas.slice(1).map((linea, indice) => {
    const celdas = linea.split(',').map((valor) => valor.trim().replace(/^"|"$/g, ''));
    const valor = (campo: string) => celdas[cabecera.indexOf(campo)];
    const categoria = valor('categoria') as CategoriaFinanciera;
    const tipo = valor('tipo') as TipoTransaccion;

    if (
      !(categoria in etiquetasCategoria) ||
      !['ingreso', 'gasto', 'ahorro'].includes(tipo) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor('fecha')) ||
      Number(valor('monto')) <= 0
    ) {
      throw new Error(`La fila ${indice + 2} contiene datos no válidos.`);
    }

    return { descripcion: valor('descripcion'), categoria, tipo, fecha: valor('fecha'), monto: Number(valor('monto')) };
  });
}

import { etiquetasCategoria } from '../constantes/categorias';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../tipos/finanzas';

/**
 * Fila leida del CSV.
 *
 * En un gasto, categoria en null significa "pendiente de clasificar". En un ingreso o
 * un ahorro significa lo definitivo: esos movimientos no tienen categoria.
 */
export type FilaImportada = Omit<Transaccion, 'id'>;

/** Resultado de la lectura, con lo que hubo que descartar por incompatible. */
export type LecturaCsv = {
  filas: FilaImportada[];
  /** Filas de ingreso o ahorro que traian categoria y se guardaron sin ella. */
  categoriasDescartadas: number;
};

/** Nombres tecnicos de las columnas. Son contrato: van sin tildes y no se traducen. */
const COLUMNAS = ['descripcion', 'categoria', 'tipo', 'fecha', 'monto'];
const TIPOS: TipoTransaccion[] = ['ingreso', 'gasto', 'ahorro'];

/** "la fila 8" / "las filas 8, 12 y 15" / "17 filas (2, 5, 8, 11, 14, 20...)" */
function enumerar(filas: number[], limite = 6): string {
  if (filas.length === 1) return `la fila ${filas[0]}`;
  if (filas.length <= limite) {
    return `las filas ${filas.slice(0, -1).join(', ')} y ${filas[filas.length - 1]}`;
  }
  return `${filas.length} filas (${filas.slice(0, limite).join(', ')}...)`;
}

/**
 * Lector del CSV de movimientos.
 *
 * La columna "categoria" sigue en la cabecera --es contrato-- pero su contenido depende
 * del tipo:
 *
 *   - gasto: opcional. Si viene se respeta, porque escribirla es una decision explicita
 *     de quien prepara el archivo. Si falta la resuelve el clasificador.
 *   - ingreso y ahorro: no corresponde. Las doce categorias son de gasto.
 *
 * Un archivo antiguo puede traer categoria en un ingreso, porque hasta ahora era
 * obligatoria. Rechazarlo dejaria inservibles todos los CSV ya existentes por un dato
 * que de todos modos era de relleno, asi que se descarta el valor y se informa cuantas
 * filas quedaron afectadas. Descartar sin avisar seria peor: la persona creeria que su
 * categoria se guardo.
 *
 * Los problemas se acumulan y se informan juntos. Abortar en la primera fila obligaba a
 * corregir el archivo de a un error por intento.
 */
export function parsearCsv(texto: string): LecturaCsv {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((linea) => linea.trim());
  if (lineas.length < 2) throw new Error('El archivo no contiene transacciones.');

  const cabecera = lineas[0].split(',').map((valor) => valor.trim().toLowerCase());
  const faltantes = COLUMNAS.filter((campo) => !cabecera.includes(campo));
  if (faltantes.length > 0) {
    throw new Error(`Faltan columnas en la cabecera: ${faltantes.join(', ')}. Usa: ${COLUMNAS.join(',')}`);
  }

  const invalidas: number[] = [];
  const desconocidas: { fila: number; valor: string }[] = [];
  const filas: FilaImportada[] = [];
  let categoriasDescartadas = 0;

  lineas.slice(1).forEach((linea, indice) => {
    const numeroDeFila = indice + 2; // +1 por la cabecera, +1 porque se cuenta desde uno
    const celdas = linea.split(',').map((valor) => valor.trim().replace(/^"|"$/g, ''));
    const valor = (campo: string) => celdas[cabecera.indexOf(campo)] ?? '';

    const descripcion = valor('descripcion');
    const tipo = valor('tipo') as TipoTransaccion;
    const fecha = valor('fecha');
    const monto = Number(valor('monto'));
    const categoriaCruda = valor('categoria');

    if (!descripcion || !TIPOS.includes(tipo) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !(monto > 0)) {
      invalidas.push(numeroDeFila);
      return;
    }
    // Solo se valida el catalogo cuando la categoria va a usarse, o sea en un gasto.
    if (tipo === 'gasto' && categoriaCruda !== '' && !(categoriaCruda in etiquetasCategoria)) {
      desconocidas.push({ fila: numeroDeFila, valor: categoriaCruda });
      return;
    }
    if (tipo !== 'gasto' && categoriaCruda !== '') categoriasDescartadas += 1;

    filas.push({
      descripcion,
      tipo,
      fecha,
      monto,
      categoria: tipo === 'gasto' && categoriaCruda !== '' ? (categoriaCruda as CategoriaFinanciera) : null
    });
  });

  const problemas: string[] = [];
  if (invalidas.length > 0) {
    problemas.push(`${enumerar(invalidas)} ${invalidas.length === 1 ? 'contiene' : 'contienen'} datos no válidos.`);
  }
  if (desconocidas.length > 0) {
    const nombres = [...new Set(desconocidas.map((item) => item.valor))].slice(0, 4).join(', ');
    problemas.push(
      `${enumerar(desconocidas.map((item) => item.fila))} ${desconocidas.length === 1 ? 'tiene' : 'tienen'} una categoría desconocida (${nombres}).`
    );
  }
  if (problemas.length > 0) {
    // Los fragmentos empiezan con "la fila" / "las filas": se capitaliza el inicio.
    throw new Error(problemas.map((frase) => frase.charAt(0).toUpperCase() + frase.slice(1)).join(' '));
  }

  if (filas.length === 0) throw new Error('El archivo no contiene transacciones.');
  return { filas, categoriasDescartadas };
}

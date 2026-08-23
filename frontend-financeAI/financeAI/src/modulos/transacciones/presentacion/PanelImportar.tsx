import { ArrowClockwise, FileCsv, Sparkle, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { parsearCsv, type FilaImportada } from '../../../compartido/utilidades/csv';
import { contarPendientes, prepararImportacion, type ClasificarLote } from '../../../compartido/utilidades/importarMovimientos';
import type { Transaccion } from '../../../compartido/tipos/finanzas';

/**
 * Importacion de movimientos por CSV, como hoja lateral.
 *
 * Antes reemplazaba la pantalla completa. Al ser una accion secundaria -- la principal
 * es revisar la lista -- se comporta igual que el panel de alta: se abre al costado y
 * la lista sigue detras.
 *
 * El archivo leido se guarda en estado. Si la clasificacion falla, no se pierde: se
 * ofrece reintentar sin volver a elegirlo. Un <input type="file"> no conserva su valor
 * de forma fiable entre intentos, asi que la copia en memoria es lo que sostiene la
 * promesa de no perder lo ya cargado.
 */
export function PanelImportar({
  onClasificarLote,
  onImportar,
  onCerrar
}: {
  onClasificarLote: ClasificarLote;
  onImportar: (filas: Omit<Transaccion, 'id'>[]) => Promise<number>;
  onCerrar: () => void;
}) {
  const [archivo, setArchivo] = useState<{ nombre: string; filas: FilaImportada[] } | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [descartadas, setDescartadas] = useState(0);

  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [onCerrar]);

  /** Clasifica lo que falte, arma el conjunto completo y recien entonces guarda. */
  async function importar(nombre: string, filas: FilaImportada[]) {
    setTrabajando(true);
    setError('');
    try {
      const pendientes = contarPendientes(filas);
      const completas = await prepararImportacion(filas, onClasificarLote);
      const guardadas = await onImportar(completas);
      setMensaje(
        pendientes > 0
          ? `${guardadas} movimientos importados. FinanceAI clasificó ${pendientes} ${pendientes === 1 ? 'gasto' : 'gastos'}.`
          : `${guardadas} movimientos importados correctamente.`
      );
      setArchivo(null);
    } catch (fallo) {
      // El archivo se conserva para poder reintentar sin volver a elegirlo.
      setArchivo({ nombre, filas });
      setMensaje('');
      setError(
        fallo instanceof Error && fallo.message
          ? fallo.message
          : 'No pudimos clasificar automáticamente algunos gastos. Tus movimientos no fueron importados. Intenta nuevamente.'
      );
    } finally {
      setTrabajando(false);
    }
  }

  async function seleccionar(evento: React.ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0];
    // Permite volver a elegir el mismo archivo despues de corregirlo.
    evento.target.value = '';
    if (!elegido) return;

    setTrabajando(true);
    setError('');
    setMensaje('');
    try {
      const { filas, categoriasDescartadas } = parsearCsv(await elegido.text());
      // No se descarta en silencio: si el archivo traia categorias donde ya no
      // corresponden, la persona tiene que enterarse.
      setDescartadas(categoriasDescartadas);
      await importar(elegido.name, filas);
    } catch (fallo) {
      // Problema de formato: no hay nada que reintentar hasta corregir el archivo.
      setArchivo(null);
      setError(fallo instanceof Error ? fallo.message : 'No fue posible leer el archivo.');
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="tx-panel" role="dialog" aria-modal="false" aria-label="Importar CSV">
      <header className="tx-panel-cabecera">
        <div>
          <h2>Importar CSV</h2>
          <p>Agrega varios movimientos a la vez.</p>
        </div>
        <button type="button" className="tx-panel-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          <X size={17} />
        </button>
      </header>

      <div className="tx-panel-cuerpo">
        <div className="tx-suelta">
          <FileCsv size={40} />
          <p>Columnas requeridas:<br /><strong>descripcion, categoria, tipo, fecha, monto</strong></p>
          <p>La fecha debe usar el formato AAAA-MM-DD.</p>
        </div>

        <p className="tx-campo-nota tx-nota-modelo">
          <Sparkle size={14} />
          FinanceAI clasifica automáticamente los gastos que no tengan categoría. Los ingresos y los ahorros no llevan categoría: deja esa columna vacía.
        </p>

        <label className="tx-boton primario" style={{ justifyContent: 'center' }}>
          <UploadSimple size={17} />
          {trabajando ? 'Procesando…' : 'Elegir archivo'}
          <input hidden type="file" accept=".csv,text/csv" onChange={seleccionar} disabled={trabajando} />
        </label>

        {archivo && !trabajando && (
          <div className="tx-reintento">
            <p><strong>{archivo.nombre}</strong> · {archivo.filas.length} {archivo.filas.length === 1 ? 'fila leída' : 'filas leídas'}</p>
            <button type="button" className="tx-boton secundario" onClick={() => importar(archivo.nombre, archivo.filas)}>
              <ArrowClockwise size={16} /> Reintentar
            </button>
          </div>
        )}

        {mensaje && <p className="tx-exito" role="status">{mensaje}</p>}
        {mensaje && descartadas > 0 && (
          <p className="tx-campo-nota" role="status">
            Se ignoró la categoría de {descartadas} {descartadas === 1 ? 'fila' : 'filas'} de ingreso o ahorro:
            las categorías describen gastos.
          </p>
        )}
        {error && (
          <p className="tx-campo-error" role="alert">
            <WarningCircle size={14} />
            {error}
          </p>
        )}

        <p className="tx-campo-nota">
          Si alguna fila tiene datos no válidos, no se importa ninguna. Corrige el archivo y vuelve a intentarlo.
        </p>
      </div>
    </div>
  );
}

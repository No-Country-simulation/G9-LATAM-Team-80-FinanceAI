import { FileCsv, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { parsearCsv } from '../../../compartido/utilidades/csv';
import type { Transaccion } from '../../../compartido/tipos/finanzas';

/**
 * Importacion de movimientos por CSV, como hoja lateral.
 *
 * Antes reemplazaba la pantalla completa. Al ser una accion secundaria -- la principal
 * es revisar la lista -- se comporta igual que el panel de alta: se abre al costado y
 * la lista sigue detras.
 *
 * El lector vive en compartido/utilidades/csv: la pantalla de Archivos CSV usa el mismo
 * formato y antes lo importaba desde este modulo.
 */
export function PanelImportar({
  onImportar,
  onCerrar
}: {
  onImportar: (filas: Omit<Transaccion, 'id'>[]) => Promise<number>;
  onCerrar: () => void;
}) {
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [onCerrar]);

  async function seleccionar(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setTrabajando(true);
    try {
      const filas = parsearCsv(await archivo.text());
      const guardadas = await onImportar(filas);
      setMensaje(`${guardadas} transacciones importadas correctamente.`);
      setError('');
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No fue posible importar el archivo.');
      setMensaje('');
    } finally {
      setTrabajando(false);
      // Permite reintentar con el mismo archivo despues de corregirlo.
      evento.target.value = '';
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

        <label className="tx-boton primario" style={{ justifyContent: 'center' }}>
          <UploadSimple size={17} />
          {trabajando ? 'Importando…' : 'Elegir archivo'}
          <input hidden type="file" accept=".csv,text/csv" onChange={seleccionar} disabled={trabajando} />
        </label>

        {mensaje && <p className="tx-exito" role="status">{mensaje}</p>}
        {error && (
          <p className="tx-campo-error" role="alert">
            <WarningCircle size={14} />
            {error}
          </p>
        )}

        <p className="tx-campo-nota">
          Si una fila tiene datos no válidos, no se importa ninguna. Corrige el archivo y vuelve a intentarlo.
        </p>
      </div>
    </div>
  );
}

import { WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { validarTransaccion } from '../../../compartido/validaciones/transacciones';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';

const TIPOS: { valor: TipoTransaccion; etiqueta: string }[] = [
  { valor: 'gasto', etiqueta: 'Gasto' },
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'ahorro', etiqueta: 'Ahorro' }
];

export type DatosTransaccion = Omit<Transaccion, 'id'>;

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Alta y edicion de un movimiento, como hoja lateral.
 *
 * Se eligio panel sobre modal porque corregir movimientos es repetitivo: se revisa la
 * lista, se arregla uno y se sigue mirando. El modal obliga a cerrar para volver a ver.
 *
 * La fecha es un campo de verdad. Antes la pantalla enviaba siempre new Date() al
 * editar, asi que corregir la descripcion de un movimiento de junio lo movia a hoy y lo
 * sacaba del mes al que pertenecia, sin avisar.
 */
export function PanelTransaccion({
  transaccion,
  guardando,
  errorGuardado,
  onGuardar,
  onCerrar
}: {
  transaccion: Transaccion | null;
  guardando: boolean;
  errorGuardado: string;
  onGuardar: (datos: DatosTransaccion) => void;
  onCerrar: () => void;
}) {
  const editando = transaccion !== null;
  const [fecha, setFecha] = useState(transaccion?.fecha ?? hoy());
  const [descripcion, setDescripcion] = useState(transaccion?.descripcion ?? '');
  const [monto, setMonto] = useState(transaccion ? String(Math.abs(transaccion.monto)) : '');
  const [categoria, setCategoria] = useState<CategoriaFinanciera>(transaccion?.categoria ?? 'alimentacion');
  const [tipo, setTipo] = useState<TipoTransaccion>(transaccion?.tipo ?? 'gasto');
  const [error, setError] = useState('');

  const panel = useRef<HTMLDivElement>(null);
  const primerCampo = useRef<HTMLInputElement>(null);

  useEffect(() => { primerCampo.current?.focus(); }, []);

  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [onCerrar]);

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const importe = Number(monto);
    const problema = validarTransaccion(descripcion, importe);
    if (problema) { setError(problema); return; }
    if (!fecha) { setError('La fecha es obligatoria.'); return; }
    setError('');
    onGuardar({ descripcion: descripcion.trim(), categoria, tipo, fecha, monto: importe });
  }

  // Solo la descripcion se marca en rojo: es el unico campo que puede quedar vacio.
  const descripcionInvalida = error !== '' && !descripcion.trim();
  const mensaje = error || errorGuardado;

  return (
    <div className="tx-panel" ref={panel} role="dialog" aria-modal="false" aria-label={editando ? 'Editar transacción' : 'Nueva transacción'}>
      <header className="tx-panel-cabecera">
        <div>
          <h2>{editando ? 'Editar transacción' : 'Nueva transacción'}</h2>
          {editando && <p>{transaccion.descripcion}</p>}
        </div>
        <button type="button" className="tx-panel-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          <X size={17} />
        </button>
      </header>

      <form onSubmit={enviar} style={{ display: 'contents' }}>
        <div className="tx-panel-cuerpo">
          <label className="tx-campo">
            <span>Fecha</span>
            <input ref={primerCampo} type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required />
          </label>

          <label className={`tx-campo ${descripcionInvalida ? 'invalido' : ''}`}>
            <span>Descripción</span>
            <input
              type="text"
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              aria-invalid={descripcionInvalida}
              required
            />
          </label>

          <div className="tx-duo">
            <label className="tx-campo">
              <span>Monto</span>
              <input type="number" min="0.01" step="0.01" value={monto} onChange={(evento) => setMonto(evento.target.value)} required />
            </label>
            <label className="tx-campo">
              <span>Tipo</span>
              <select value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoTransaccion)}>
                {TIPOS.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
              </select>
            </label>
          </div>

          <label className="tx-campo">
            <span>Categoría</span>
            <select value={categoria} onChange={(evento) => setCategoria(evento.target.value as CategoriaFinanciera)}>
              {Object.entries(etiquetasCategoria).map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
            </select>
          </label>

          <p className="tx-campo-nota">La categoría que elijas se guarda y es la que verás en la lista.</p>

          {mensaje && (
            <p className="tx-campo-error" role="alert">
              <WarningCircle size={14} weight="regular" />
              {mensaje}
            </p>
          )}
        </div>

        <div className="tx-panel-pie">
          <button type="submit" className="tx-boton primario" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar transacción'}
          </button>
          <button type="button" className="tx-enlace" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

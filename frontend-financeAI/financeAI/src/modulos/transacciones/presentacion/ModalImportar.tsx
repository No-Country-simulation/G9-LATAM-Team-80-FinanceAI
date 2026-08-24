import { ArrowClockwise, DownloadSimple, FileCsv, Sparkle, UploadSimple, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { ApiError } from '../../../compartido/servicios/api.service';
import { parsearCsv, type FilaImportada, type ProblemaFila } from '../../../compartido/utilidades/csv';
import { prepararImportacion, type ClasificarLote } from '../../../compartido/utilidades/importarMovimientos';
import { descargarPlantilla } from '../../../compartido/utilidades/plantillaCsv';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';

/** Una fila que el backend rechazo, con el motivo tal cual lo dio la validacion. */
type ErrorFila = { fila: number; descripcion: string; mensajes: string[] };

/**
 * El backend valida cada transaccion del lote y devuelve el detalle por campo (ver
 * GlobalExceptionHandler), con claves como "transacciones[12].fecha". El parser del CSV
 * ya descarto antes las filas obviamente rotas, asi que si algo llega hasta aca es una
 * regla que el frontend no revisa -- hoy, sobre todo, una fecha futura. Sin esto la
 * persona solo veia "los datos enviados no son validos" y ninguna forma de saber cual de
 * treinta y tantas filas era la culpable.
 */
function erroresDeLote(errores: Record<string, string>, movimientos: Omit<Transaccion, 'id'>[]): ErrorFila[] {
  const porFila = new Map<number, string[]>();
  for (const [campo, mensaje] of Object.entries(errores)) {
    const coincide = campo.match(/^transacciones\[(\d+)\]/);
    if (!coincide) continue;
    const indice = Number(coincide[1]);
    porFila.set(indice, [...(porFila.get(indice) ?? []), mensaje]);
  }
  return [...porFila.entries()]
    .sort(([a], [b]) => a - b)
    .map(([indice, mensajes]) => ({
      fila: indice + 1,
      descripcion: movimientos[indice]?.descripcion ?? `fila ${indice + 1}`,
      mensajes
    }));
}

const ETIQUETAS_TIPO: Record<TipoTransaccion, string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  ahorro: 'Ahorro'
};

/** Cuantas filas se dibujan. El resto se importa igual, solo no se lista. */
const FILAS_VISIBLES = 20;

const ENFOCABLES = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

type Estado =
  | { paso: 'archivo' }
  | { paso: 'procesando' }
  | { paso: 'revision'; nombre: string; movimientos: Omit<Transaccion, 'id'>[]; clasificados: number; descartadas: number }
  | { paso: 'guardando'; nombre: string; movimientos: Omit<Transaccion, 'id'>[] };

/**
 * Importacion de movimientos por CSV.
 *
 * Dos cambios de fondo respecto de la version anterior:
 *
 *   - El archivo ya no se guarda al elegirlo. Primero se clasifica y se muestra el
 *     resultado, para que la persona revise las categorias antes de persistir nada.
 *     Antes el modelo decidia por cien filas de una vez y nadie lo veia.
 *   - La plantilla no pide la columna categoria: en los gastos la resuelve FinanceAI y
 *     en ingresos y ahorros no corresponde.
 *
 * Se conserva la lectura de un CSV antiguo que si traiga categoria, para no dejar
 * inservibles los archivos que ya circulan.
 */
export function ModalImportar({
  onClasificarLote,
  onImportar,
  onCerrar
}: {
  onClasificarLote: ClasificarLote;
  onImportar: (filas: Omit<Transaccion, 'id'>[]) => Promise<number>;
  onCerrar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>({ paso: 'archivo' });
  const [error, setError] = useState('');
  const [problemas, setProblemas] = useState<ProblemaFila[]>([]);
  const [erroresLote, setErroresLote] = useState<ErrorFila[]>([]);
  /* Lo ya leido se guarda para poder reintentar sin volver a elegir el archivo. */
  const [leido, setLeido] = useState<{ nombre: string; filas: FilaImportada[] } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const modal = useRef<HTMLDivElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const origen = document.activeElement as HTMLElement | null;
    return () => origen?.focus?.();
  }, []);

  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { onCerrar(); return; }
      if (evento.key !== 'Tab' || !modal.current) return;
      const enfocables = [...modal.current.querySelectorAll<HTMLElement>(ENFOCABLES)]
        .filter((elemento) => !elemento.hasAttribute('disabled') && elemento.offsetParent !== null);
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [onCerrar]);

  /** Clasifica los gastos pendientes en UN lote y pasa a revision. Todavia no guarda. */
  async function preparar(nombre: string, filas: FilaImportada[], descartadas: number) {
    setEstado({ paso: 'procesando' });
    setError('');
    try {
      const pendientes = filas.filter((fila) => fila.tipo === 'gasto' && fila.categoria === null).length;
      const movimientos = await prepararImportacion(filas, onClasificarLote);
      setEstado({ paso: 'revision', nombre, movimientos, clasificados: pendientes, descartadas });
    } catch {
      // No se guarda nada y no se pierde el archivo: se ofrece reintentar.
      setEstado({ paso: 'archivo' });
      setError('No pudimos clasificar los gastos de este archivo. No se importó ningún movimiento.');
    }
  }

  async function leerArchivo(archivo: File) {
    setError('');
    setProblemas([]);
    setErroresLote([]);
    setLeido(null);
    setEstado({ paso: 'procesando' });
    try {
      const { filas, categoriasDescartadas, problemas: fallos } = parsearCsv(await archivo.text());
      if (fallos.length > 0) {
        // Todo o nada: con una fila dudosa no se importa ninguna.
        setProblemas(fallos);
        setEstado({ paso: 'archivo' });
        return;
      }
      setLeido({ nombre: archivo.name, filas });
      await preparar(archivo.name, filas, categoriasDescartadas);
    } catch (fallo) {
      setEstado({ paso: 'archivo' });
      setError(fallo instanceof Error ? fallo.message : 'No fue posible leer el archivo.');
    }
  }

  function alElegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = ''; // permite volver a elegir el mismo archivo corregido
    if (archivo) void leerArchivo(archivo);
  }

  function alSoltar(evento: React.DragEvent) {
    evento.preventDefault();
    setArrastrando(false);
    const archivo = evento.dataTransfer.files?.[0];
    if (archivo) void leerArchivo(archivo);
  }

  /** Correccion humana: reemplaza la categoria de una fila antes de importar. */
  function corregir(indice: number, categoria: CategoriaFinanciera) {
    setEstado((actual) => actual.paso !== 'revision' ? actual : {
      ...actual,
      movimientos: actual.movimientos.map((fila, i) => i === indice ? { ...fila, categoria } : fila)
    });
  }

  async function importar() {
    if (estado.paso !== 'revision') return;
    const { nombre, movimientos } = estado;
    setEstado({ paso: 'guardando', nombre, movimientos });
    setError('');
    setErroresLote([]);
    try {
      /*
       * Se guarda lo que hay en pantalla. No se vuelve a clasificar: seria una segunda
       * pasada del modelo que pisaria las correcciones que acaban de hacerse.
       */
      await onImportar(movimientos);
      onCerrar();
    } catch (fallo) {
      setEstado({ paso: 'revision', nombre, movimientos, clasificados: 0, descartadas: 0 });
      const detalle = fallo instanceof ApiError ? erroresDeLote(fallo.errores, movimientos) : [];
      setErroresLote(detalle);
      // Con detalle por fila el mensaje generico sobra: ya se muestra algo mas util.
      setError(detalle.length > 0 ? '' : fallo instanceof Error ? fallo.message : 'No fue posible importar los movimientos.');
    }
  }

  const enRevision = estado.paso === 'revision' || estado.paso === 'guardando';
  const ocupado = estado.paso === 'procesando' || estado.paso === 'guardando';

  return (
    <div className="tx-velo">
      <div
        className={`tx-modal ${enRevision ? 'ancho' : ''}`}
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <header className="tx-modal-cabecera">
          <div>
            <h2 id={idTitulo}>Importar movimientos</h2>
            <p className="tx-modal-sub">Agrega varios movimientos de una sola vez.</p>
          </div>
          <button type="button" className="tx-modal-cerrar" aria-label="Cerrar" onClick={onCerrar}>
            <X size={18} />
          </button>
        </header>

        <div className="tx-modal-cuerpo">
          {!enRevision ? (
            <>
              <label
                className={`tx-soltar ${arrastrando ? 'activa' : ''}`}
                onDragOver={(evento) => { evento.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={alSoltar}
              >
                <FileCsv size={38} />
                <strong>{ocupado ? 'Procesando…' : 'Arrastra tu archivo aquí'}</strong>
                <span>o</span>
                <span className="tx-boton secundario" aria-hidden="true">
                  <UploadSimple size={16} /> Elegir archivo
                </span>
                <input hidden type="file" accept=".csv,text/csv" onChange={alElegir} disabled={ocupado} />
              </label>

              <p className="tx-ayuda con-icono">
                <Sparkle size={15} />
                FinanceAI clasificará automáticamente tus gastos. Podrás revisar las categorías antes de importar.
              </p>

              <div className="tx-plantilla">
                <p>¿No tienes un archivo preparado?</p>
                <button type="button" className="tx-boton secundario" onClick={descargarPlantilla}>
                  <DownloadSimple size={16} /> Descargar plantilla CSV
                </button>
                <small>
                  <span>La plantilla incluye: <strong>Descripción · Tipo · Fecha · Monto</strong></span>
                  <span>Formato de fecha: <strong>AAAA-MM-DD</strong></span>
                </small>
              </div>

              {problemas.length > 0 && (
                <div className="tx-problemas" role="alert">
                  <p>
                    Encontramos {problemas.length} {problemas.length === 1 ? 'fila que necesita' : 'filas que necesitan'} revisión.
                    No se importó ningún movimiento.
                  </p>
                  <ul>
                    {problemas.slice(0, 8).map((problema) => (
                      <li key={problema.fila}>Fila {problema.fila} · {problema.motivo}</li>
                    ))}
                  </ul>
                  {problemas.length > 8 && <small>y {problemas.length - 8} más</small>}
                </div>
              )}

              {error && (
                <p className="tx-campo-error" role="alert">
                  <WarningCircle size={15} />
                  {error}
                </p>
              )}

              {leido && !ocupado && (
                <div className="tx-reintento">
                  <p><strong>{leido.nombre}</strong> · {leido.filas.length} {leido.filas.length === 1 ? 'fila leída' : 'filas leídas'}</p>
                  <button type="button" className="tx-boton secundario" onClick={() => preparar(leido.nombre, leido.filas, 0)}>
                    <ArrowClockwise size={16} /> Reintentar
                  </button>
                </div>
              )}
            </>
          ) : (
            <Revision
              estado={estado}
              onCorregir={corregir}
              error={error}
              erroresLote={erroresLote}
            />
          )}
        </div>

        {enRevision && (
          <div className="tx-modal-pie">
            <button type="button" className="tx-boton primario" onClick={importar} disabled={ocupado}>
              {estado.paso === 'guardando'
                ? 'Importando…'
                : `Importar ${estado.movimientos.length} ${estado.movimientos.length === 1 ? 'movimiento' : 'movimientos'}`}
            </button>
            <button type="button" className="tx-enlace" onClick={onCerrar}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Revision({
  estado,
  onCorregir,
  error,
  erroresLote
}: {
  estado: Extract<Estado, { paso: 'revision' } | { paso: 'guardando' }>;
  onCorregir: (indice: number, categoria: CategoriaFinanciera) => void;
  error: string;
  erroresLote: ErrorFila[];
}) {
  const total = estado.movimientos.length;
  const visibles = estado.movimientos.slice(0, FILAS_VISIBLES);
  const clasificados = estado.paso === 'revision' ? estado.clasificados : 0;
  const descartadas = estado.paso === 'revision' ? estado.descartadas : 0;

  return (
    <>
      <p className="tx-revision-resumen">
        <strong>{total} {total === 1 ? 'movimiento listo' : 'movimientos listos'} para importar</strong>
        {clasificados > 0 && <> · FinanceAI clasificó {clasificados} {clasificados === 1 ? 'gasto' : 'gastos'}</>}
      </p>

      <div className="tx-revision">
        <div className="tx-revision-cabecera" role="row">
          <span role="columnheader">Movimiento</span>
          <span role="columnheader">Tipo</span>
          <span role="columnheader">Clasificación</span>
        </div>
        <ul className="tx-revision-filas">
          {visibles.map((fila, indice) => (
            <li key={`${fila.descripcion}-${indice}`} className="tx-revision-fila">
              <span className="tx-revision-desc" title={fila.descripcion}>{fila.descripcion}</span>
              <span className={`tx-pill-tipo ${fila.tipo}`}>{ETIQUETAS_TIPO[fila.tipo]}</span>
              {fila.tipo === 'gasto' ? (
                <select
                  className="tx-revision-select"
                  value={fila.categoria ?? ''}
                  aria-label={`Clasificación de ${fila.descripcion}`}
                  onChange={(evento) => onCorregir(indice, evento.target.value as CategoriaFinanciera)}
                >
                  {Object.entries(etiquetasCategoria).map(([id, etiqueta]) => (
                    <option key={id} value={id}>{etiqueta}</option>
                  ))}
                </select>
              ) : (
                /* Ingresos y ahorros no tienen categoria: no hay selector que ofrecer. */
                <span className="tx-vacio" aria-label="Sin clasificación">—</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {total > FILAS_VISIBLES && (
        <p className="tx-ayuda">
          Mostrando {FILAS_VISIBLES} de {total} movimientos. Se importarán todos.
        </p>
      )}

      {descartadas > 0 && (
        <p className="tx-ayuda">
          Se ignoró la categoría de {descartadas} {descartadas === 1 ? 'fila' : 'filas'} de ingreso o ahorro:
          las categorías describen gastos.
        </p>
      )}

      {erroresLote.length > 0 && (
        <div className="tx-problemas" role="alert">
          <p>
            El servidor rechazó {erroresLote.length} {erroresLote.length === 1 ? 'fila' : 'filas'}.
            No se importó ningún movimiento.
          </p>
          <ul>
            {erroresLote.slice(0, 8).map((item) => (
              <li key={item.fila}>Fila {item.fila} · {item.descripcion} · {item.mensajes.join(' · ')}</li>
            ))}
          </ul>
          {erroresLote.length > 8 && <small>y {erroresLote.length - 8} más</small>}
        </div>
      )}

      {error && (
        <p className="tx-campo-error" role="alert">
          <WarningCircle size={15} />
          {error}
        </p>
      )}
    </>
  );
}

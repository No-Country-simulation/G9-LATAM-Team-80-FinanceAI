import { CheckCircle, Sparkle, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { validarTransaccion } from '../../../compartido/validaciones/transacciones';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';

const TIPOS: { valor: TipoTransaccion; etiqueta: string }[] = [
  { valor: 'gasto', etiqueta: 'Gasto' },
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'ahorro', etiqueta: 'Ahorro' }
];

/** Elementos que pueden recibir foco dentro del modal, para la trampa de tabulacion. */
const ENFOCABLES = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export type DatosTransaccion = Omit<Transaccion, 'id'>;

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

/** Un gasto que ya viene con categoria guardada llega con decision humana tomada. */
function editandoConCategoria(transaccion: Transaccion | null) {
  return transaccion !== null && transaccion.categoria !== null;
}

/** Descripcion con sustancia suficiente como para molestar al modelo. */
function vale(descripcion: string) {
  return descripcion.trim().length >= 3;
}

/**
 * Alta y edicion de un movimiento, como modal centrado.
 *
 * Antes era una hoja lateral. El modal deja la tabla reconocible detras --el velo es
 * suave y no difumina-- y evita el conflicto de esquina con el lanzador del agente:
 * el formulario esta al centro, asi que el lanzador se queda visible en su rincon sin
 * tapar nada.
 *
 * La fecha es un campo de verdad. Antes la pantalla enviaba siempre new Date() al
 * editar, asi que corregir la descripcion de un movimiento de junio lo movia a hoy y lo
 * sacaba del mes al que pertenecia, sin avisar.
 *
 * La categoria pertenece SOLO a los gastos. Las doce del catalogo son categorias de
 * gasto, asi que un ingreso o un ahorro guardan null y no se les pregunta nada: antes
 * se rellenaba con "otros", que luego se leia en pantalla como una clasificacion real.
 *
 *   - GASTO nuevo: no se pregunta, lo resuelve el clasificador a traves de
 *     POST /api/clasificar-transacciones, el mismo que ya usa el analisis.
 *   - GASTO en edicion: se pregunta. El modelo se equivoca --clasifica "Peluqueria"
 *     como profesionales-- y la correccion humana tiene que ser posible.
 *   - INGRESO y AHORRO: nunca se pregunta, ni al crear ni al editar.
 *
 * Cambiar el tipo cambia el trato: pasar a ingreso descarta la categoria, y volver a
 * gasto obliga a conseguir una antes de guardar.
 */
export function ModalTransaccion({
  transaccion,
  guardando,
  errorGuardado,
  onClasificar,
  onGuardar,
  onCerrar
}: {
  transaccion: Transaccion | null;
  guardando: boolean;
  errorGuardado: string;
  onClasificar: (descripcion: string, monto: number) => Promise<CategoriaFinanciera>;
  onGuardar: (datos: DatosTransaccion) => void;
  onCerrar: () => void;
}) {
  const editando = transaccion !== null;
  const [fecha, setFecha] = useState(transaccion?.fecha ?? hoy());
  const [descripcion, setDescripcion] = useState(transaccion?.descripcion ?? '');
  const [monto, setMonto] = useState(transaccion ? String(Math.abs(transaccion.monto)) : '');
  const [categoria, setCategoria] = useState<CategoriaFinanciera | ''>(transaccion?.categoria ?? '');
  const [tipo, setTipo] = useState<TipoTransaccion>(transaccion?.tipo ?? 'gasto');
  const [error, setError] = useState('');
  const [clasificando, setClasificando] = useState(false);
  /*
   * Si el clasificador no responde --con el ML caido el cortacircuitos devuelve 502--
   * se pide la categoria a mano en vez de bloquear el alta o inventar un valor.
   */
  const [respaldoManual, setRespaldoManual] = useState(false);

  /*
   * Se distinguen dos cosas que antes eran una sola:
   *
   *   prediccion  -> lo que dijo el modelo, y para que descripcion lo dijo
   *   categoria   -> lo que se va a guardar, que puede ser la prediccion o no
   *
   * Y se recuerda si la persona la toco. En edicion la categoria guardada cuenta como
   * decision humana desde el primer momento: es la fuente de verdad y el modelo no
   * debe pisarla por el mero hecho de abrir el movimiento.
   */
  const [prediccion, setPrediccion] = useState<{ descripcion: string; categoria: CategoriaFinanciera } | null>(null);
  const [corregida, setCorregida] = useState(editandoConCategoria(transaccion));
  /*
   * Espejo de `corregida` para leerlo dentro de la respuesta asincrona del modelo sin
   * quedarse con el valor viejo de la clausura, y sin llamar a otro setState dentro de
   * un actualizador --React puede ejecutarlos dos veces en modo estricto--.
   */
  const corregidaRef = useRef(editandoConCategoria(transaccion));
  const marcarCorregida = (valor: boolean) => { corregidaRef.current = valor; setCorregida(valor); };

  /* Ultima descripcion enviada al modelo: evita repetir la misma consulta. */
  const yaClasificada = useRef<string | null>(transaccion?.descripcion?.trim() ?? null);

  const modal = useRef<HTMLDivElement>(null);
  const primerCampo = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  useEffect(() => { primerCampo.current?.focus(); }, []);

  // Al cerrar, el foco vuelve al boton que abrio el modal.
  useEffect(() => {
    const origen = document.activeElement as HTMLElement | null;
    return () => origen?.focus?.();
  }, []);

  useEffect(() => {
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { onCerrar(); return; }
      if (evento.key !== 'Tab' || !modal.current) return;

      // Trampa de foco: el tabulador circula dentro del modal y no se escapa al fondo.
      const enfocables = [...modal.current.querySelectorAll<HTMLElement>(ENFOCABLES)]
        .filter((elemento) => !elemento.hasAttribute('disabled') && elemento.offsetParent !== null);
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [onCerrar]);

  const esGasto = tipo === 'gasto';

  /*
   * Se clasifica al salir de Descripcion, no en cada tecla: una consulta por pulsacion
   * satura al servicio y ademas devuelve categorias de palabras a medio escribir.
   * Tampoco se repite si la descripcion no cambio desde la ultima vez.
   */
  async function clasificar(texto: string, tipoActual: TipoTransaccion) {
    const limpio = texto.trim();
    if (tipoActual !== 'gasto' || !vale(limpio) || limpio === yaClasificada.current) return;

    yaClasificada.current = limpio;
    setClasificando(true);
    setRespaldoManual(false);
    try {
      const sugerida = await onClasificar(limpio, Number(monto) || 1);
      setPrediccion({ descripcion: limpio, categoria: sugerida });
      /*
       * Si la persona todavia no eligio nada, se adopta la sugerencia. Si ya habia
       * corregido a mano, NO se pisa: la sugerencia queda ofrecida y decide ella.
       */
      if (!corregidaRef.current) setCategoria(sugerida);
      setError('');
    } catch {
      // Se conserva todo lo escrito; solo aparece el selector para terminar a mano.
      setPrediccion(null);
      /*
       * Si la categoria venia del modelo, se limpia: era la de la descripcion anterior
       * y dejarla puesta invitaria a guardar una clasificacion que ya no corresponde.
       * Una eleccion humana previa si se respeta.
       */
      if (!corregidaRef.current) setCategoria('');
      setRespaldoManual(true);
      setError('No pudimos clasificar automáticamente este gasto. Selecciona una categoría para continuar.');
    } finally {
      setClasificando(false);
    }
  }

  /** Sugerencia nueva que difiere de lo que la persona ya eligio. */
  const sugerenciaPendiente = corregida && prediccion !== null
    && prediccion.descripcion === descripcion.trim()
    && prediccion.categoria !== categoria
    ? prediccion.categoria
    : null;
  /*
   * El modelo entra cuando hace falta una categoria y no la hay: en el alta de un
   * gasto, y tambien al convertir un ingreso o un ahorro en gasto durante la edicion.
   */
  /* El selector aparece en cuanto hay algo que mostrar o que elegir. */
  const pideCategoria = esGasto && (categoria !== '' || respaldoManual || sugerenciaPendiente !== null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const importe = Number(monto);
    const problema = validarTransaccion(descripcion, importe);
    if (problema) { setError(problema); return; }
    if (!fecha) { setError('La fecha es obligatoria.'); return; }
    setError('');

    // Ingresos y ahorros nunca llevan categoria, aunque vinieran de haber sido gasto.
    if (!esGasto) {
      onGuardar({ descripcion: descripcion.trim(), categoria: null, tipo, fecha, monto: importe });
      return;
    }

    /*
     * Si ya hay categoria --predicha y aceptada, o elegida a mano-- se guarda tal cual.
     * No se vuelve a consultar al modelo en el submit: seria una segunda clasificacion
     * y podria pisar la decision de la persona.
     */
    if (categoria) {
      onGuardar({ descripcion: descripcion.trim(), categoria, tipo, fecha, monto: importe });
      return;
    }

    // Sin categoria todavia: quien guarda sin salir del campo cae aqui.
    setClasificando(true);
    try {
      const sugerida = await onClasificar(descripcion.trim(), importe);
      setPrediccion({ descripcion: descripcion.trim(), categoria: sugerida });
      yaClasificada.current = descripcion.trim();
      onGuardar({ descripcion: descripcion.trim(), categoria: sugerida, tipo, fecha, monto: importe });
    } catch {
      setRespaldoManual(true);
      setError('No pudimos clasificar automáticamente este gasto. Selecciona una categoría para continuar.');
    } finally {
      setClasificando(false);
    }
  }

  const descripcionInvalida = error !== '' && !descripcion.trim();
  const mensaje = error || errorGuardado;
  const ocupado = guardando || clasificando;
  const titulo = editando ? 'Editar transacción' : 'Nueva transacción';

  return (
    /*
     * El velo NO cierra al pulsarlo: un clic despistado fuera del modal borraria lo ya
     * escrito. Se sale por la X, por Cancelar o con Escape.
     */
    <div className="tx-velo">
      <div className="tx-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <header className="tx-modal-cabecera">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="tx-modal-cerrar" aria-label="Cerrar" onClick={onCerrar}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={enviar}>
          <div className="tx-modal-cuerpo">
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
                onBlur={(evento) => clasificar(evento.target.value, tipo)}
                placeholder="Ej. Cine, Mercado Éxito, Gasolina…"
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
                <select
                  value={tipo}
                  onChange={(evento) => {
                    const nuevo = evento.target.value as TipoTransaccion;
                    setTipo(nuevo);
                    // Pasar a ingreso o ahorro descarta la categoria y todo el estado
                    // de clasificacion; volver a gasto reclasifica la descripcion actual.
                    setCategoria('');
                    setPrediccion(null);
                    marcarCorregida(false);
                    setRespaldoManual(false);
                    setError('');
                    yaClasificada.current = null;
                    if (nuevo === 'gasto') void clasificar(descripcion, nuevo);
                  }}
                >
                  {TIPOS.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
                </select>
              </label>
            </div>

            {pideCategoria && (
              <label className="tx-campo">
                <span>Categoría</span>
                <select
                  value={categoria}
                  onChange={(evento) => {
                    // A partir de aqui manda la persona: el modelo deja de pisar.
                    setCategoria(evento.target.value as CategoriaFinanciera);
                    marcarCorregida(true);
                    setError('');
                  }}
                  required
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  {Object.entries(etiquetasCategoria).map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
                </select>
              </label>
            )}

            {!esGasto ? (
              <p className="tx-ayuda">
                Los ingresos y los ahorros no llevan categoría: las categorías describen gastos.
              </p>
            ) : clasificando ? (
              <p className="tx-ayuda" role="status">
                <Sparkle size={15} />
                FinanceAI está clasificando…
              </p>
            ) : sugerenciaPendiente ? (
              /*
               * La persona ya habia corregido y llega una sugerencia distinta. No se
               * aplica sola: se ofrece. Sobrescribir en silencio le borraria su decision.
               */
              <p className="tx-ayuda">
                <Sparkle size={15} />
                FinanceAI sugiere <strong>{etiquetasCategoria[sugerenciaPendiente]}</strong> para esta descripción.{' '}
                <button
                  type="button"
                  className="tx-enlace tx-usar-sugerencia"
                  onClick={() => { setCategoria(sugerenciaPendiente); marcarCorregida(false); }}
                >
                  Usar sugerencia
                </button>
              </p>
            ) : respaldoManual ? null : prediccion && !corregida ? (
              <p className="tx-ayuda ok">
                <CheckCircle size={15} />
                Clasificada automáticamente por FinanceAI. Puedes cambiarla si no es correcta.
              </p>
            ) : editando && categoria ? (
              <p className="tx-ayuda">
                FinanceAI clasificó este movimiento automáticamente. Puedes corregir la categoría si es necesario.
              </p>
            ) : categoria ? null : (
              <p className="tx-ayuda">
                <Sparkle size={15} />
                FinanceAI clasificará automáticamente la categoría a partir de la descripción.
              </p>
            )}

            {mensaje && (
              <p className="tx-campo-error" role="alert">
                <WarningCircle size={15} />
                {mensaje}
              </p>
            )}
          </div>

          <div className="tx-modal-pie">
            <button type="submit" className="tx-boton primario" disabled={ocupado}>
              {clasificando ? 'Clasificando…' : guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar transacción'}
            </button>
            <button type="button" className="tx-enlace" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

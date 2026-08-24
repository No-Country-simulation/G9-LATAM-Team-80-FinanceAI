import { Info, Plus, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import type { CategoriaFinanciera, PresupuestoCategoria } from '../../../compartido/tipos/finanzas';
import '../../../compartido/estilos/modal.css';

const ENFOCABLES = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/** El hueco real de DECIMAL(15,2) en la tabla. Mas alla revienta al insertar. */
const LIMITE_MAXIMO = 9_999_999_999_999.99;

const CATEGORIAS = Object.keys(etiquetasCategoria) as CategoriaFinanciera[];

export type LimiteAGuardar = { categoria: CategoriaFinanciera; presupuesto: number };

/**
 * Una linea del editor.
 *
 * "nueva" distingue lo que todavia no existe en la base de datos de lo que si. Quitar
 * cualquiera de las dos es local nada mas apretar el boton (ver quitarFila); solo si el
 * formulario termina en "Guardar presupuesto" una fila persistida quitada se convierte en
 * un DELETE real. Asi "Cancelar" puede deshacer un "Quitar" sin haber tocado la base.
 */
type Fila = {
  categoria: CategoriaFinanciera;
  /** Cadena, no numero: "" es "sin monto" y 0 no lo sustituye. */
  monto: string;
  nueva: boolean;
};

/**
 * El presupuesto del mes, con lo que ya tiene limite a la vista.
 *
 * Ni las doce categorias de golpe ni una sola con un desplegable para navegar. Empieza
 * en las que ya forman parte del plan -- que es lo que la persona viene a revisar -- y
 * el resto se incorporan de una en una cuando hacen falta. Asi no hay que recordar cuales
 * se revisaron ni cuales faltan: estan todas delante.
 *
 * El periodo se captura al abrir y no cambia mientras el formulario esta en pantalla: si
 * alguien mueve el selector del encabezado por detras, lo que se guarda sigue siendo el
 * mes que el titulo dice estar editando.
 */
export function ModalPresupuesto({
  periodo, periodoClave, periodoActual, categoriaInicial, presupuestos, onGuardar, onEliminar, onCerrar
}: {
  /** "agosto de 2026". Contexto, no un campo mas del formulario. */
  periodo: string;
  /** "2026-08". El que viaja al guardar. */
  periodoClave: string | null;
  /** El del encabezado ahora mismo, para avisar si se ha movido por detras. */
  periodoActual: string | null;
  categoriaInicial?: CategoriaFinanciera;
  presupuestos: PresupuestoCategoria[];
  onGuardar: (limites: LimiteAGuardar[]) => Promise<void>;
  /** El DELETE real de una categoria. Se llama solo al confirmar "Guardar presupuesto", nunca antes. */
  onEliminar: (categoria: CategoriaFinanciera) => Promise<void>;
  onCerrar: () => void;
}) {
  /* Los limites del periodo ya estan en memoria: el editor no pide nada al abrir. */
  const guardados = useMemo(
    () => new Map(presupuestos.map((item) => [item.categoria, item.presupuesto])),
    [presupuestos]
  );

  const [filas, setFilas] = useState<Fila[]>(() => {
    const existentes: Fila[] = [...guardados.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, monto]) => ({ categoria, monto: String(monto), nueva: false }));

    /*
     * "Definir limite" sobre una categoria sin presupuesto entra aqui: se abre el editor
     * completo del mes con esa categoria ya agregada al final, no un dialogo aparte.
     */
    if (categoriaInicial && !guardados.has(categoriaInicial)) {
      existentes.push({ categoria: categoriaInicial, monto: '', nueva: true });
    }
    return existentes;
  });

  const [errores, setErrores] = useState<Partial<Record<CategoriaFinanciera, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);
  /**
   * Categorias persistidas que "Quitar" saco de la lista, pendientes de un DELETE real.
   *
   * No se borran al pulsar el boton: eso hacia que "Cancelar" no pudiera deshacer nada,
   * porque el DELETE ya habia pasado. Como el resto del formulario, quitar una fila es un
   * cambio pendiente -- se confirma recien en "Guardar presupuesto", igual que un monto
   * editado o una fila nueva.
   */
  const [aEliminar, setAEliminar] = useState<Set<CategoriaFinanciera>>(new Set());

  const modal = useRef<HTMLDivElement>(null);
  const campoInicial = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  const usadas = useMemo(() => new Set(filas.map((f) => f.categoria)), [filas]);
  const disponibles = useMemo(() => CATEGORIAS.filter((c) => !usadas.has(c)), [usadas]);
  const conMonto = filas.filter((f) => f.monto.trim() !== '').length;
  const periodoSeMovio = periodoActual !== periodoClave;

  /*
   * Con el dialogo abierto, la aplicacion de detras queda fuera de juego: no se desplaza
   * y no recibe foco. `inert` sobre la raiz apaga de una vez barra lateral, encabezado,
   * selector de periodo, tabla y lanzador del agente; oscurecerlos no bastaba porque
   * seguian siendo tabulables. El dialogo vive fuera de esa raiz -- se monta en body --
   * asi que no se apaga a si mismo.
   *
   * Devolver el foco va en este mismo efecto y DESPUES de quitar `inert`: en dos efectos
   * separados, la limpieza del primero intentaba enfocar el boton mientras la raiz seguia
   * inerte, la llamada se ignoraba en silencio y el foco acababa en el body.
   */
  useEffect(() => {
    const origen = document.activeElement as HTMLElement | null;
    const raiz = document.querySelector('.layout');
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    raiz?.setAttribute('inert', '');
    return () => {
      raiz?.removeAttribute('inert');
      document.body.style.overflow = overflowPrevio;
      origen?.focus?.();
    };
  }, []);

  /* La categoria por la que se entro queda enfocada y a la vista. */
  useEffect(() => {
    campoInicial.current?.focus();
    campoInicial.current?.scrollIntoView({ block: 'nearest' });
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

  function limpiarError(categoria: CategoriaFinanciera) {
    setErrores(({ [categoria]: _, ...resto }) => resto);
    setErrorGeneral('');
  }

  function escribirMonto(categoria: CategoriaFinanciera, valor: string) {
    setFilas((actuales) => actuales.map((f) => (f.categoria === categoria ? { ...f, monto: valor } : f)));
    limpiarError(categoria);
  }

  /** Cambiar la categoria de una fila nueva conserva el monto que ya se hubiera escrito. */
  function cambiarCategoria(anterior: CategoriaFinanciera, nueva: CategoriaFinanciera) {
    setFilas((actuales) => actuales.map((f) => (f.categoria === anterior ? { ...f, categoria: nueva } : f)));
    // Misma reconciliacion que agregarFila: si la categoria elegida estaba marcada para
    // borrar, elegirla de nuevo aqui significa "conservarla", no "borrarla".
    setAEliminar((actual) => { if (!actual.has(nueva)) return actual; const copia = new Set(actual); copia.delete(nueva); return copia; });
    limpiarError(anterior);
  }

  function agregarFila() {
    const libre = disponibles[0];
    if (!libre) return;
    setFilas((actuales) => [...actuales, { categoria: libre, monto: '', nueva: true }]);
    // Si se habia quitado antes en esta misma sesion del formulario y se vuelve a
    // agregar, ya no hay nada que borrar: la intencion cambio a "conservarla".
    setAEliminar((actual) => { if (!actual.has(libre)) return actual; const copia = new Set(actual); copia.delete(libre); return copia; });
    setErrorGeneral('');
  }

  /**
   * Quitar una fila -- nueva o ya guardada -- solo sale de la lista local. Ninguna de las
   * dos toca la base de datos aqui: una fila nueva nunca la toco, y una persistida queda
   * marcada en `aEliminar` para el DELETE real, que recien se dispara si el formulario
   * termina en "Guardar presupuesto". "Cancelar" no llama a nada, asi que deja todo como
   * estaba con solo cerrar.
   */
  function quitarFila(categoria: CategoriaFinanciera) {
    const fila = filas.find((f) => f.categoria === categoria);
    if (!fila) return;
    limpiarError(categoria);
    setFilas((actuales) => actuales.filter((f) => f.categoria !== categoria));
    if (!fila.nueva) setAEliminar((actual) => new Set(actual).add(categoria));
  }

  /**
   * Que se manda y que no.
   *
   * Solo lo nuevo y lo que cambio de valor. Reenviar un limite identico es una escritura
   * para nada, y el lote sigue siendo atomico porque va en una sola peticion: lo que se
   * gana comparando aqui no cuesta atomicidad.
   */
  function revisar() {
    const fallos: Partial<Record<CategoriaFinanciera, string>> = {};
    const aGuardar: LimiteAGuardar[] = [];

    for (const fila of filas) {
      const texto = fila.monto.trim();
      const anterior = guardados.get(fila.categoria);

      if (texto === '') {
        /*
         * Vaciar el campo no borra la fila: para eso esta el boton "Quitar", que si borra
         * de verdad (ver quitarFila). Un campo vacio solo significa "todavia no escribiste
         * nada aqui", sea la fila nueva o ya guardada.
         */
        fallos[fila.categoria] = 'Escribe un monto o quita esta categoría.';
        continue;
      }

      const limite = Number(texto);
      if (!Number.isFinite(limite)) { fallos[fila.categoria] = 'Escribe un número.'; continue; }
      if (limite <= 0) { fallos[fila.categoria] = 'El límite debe ser mayor que cero.'; continue; }
      if (limite > LIMITE_MAXIMO) { fallos[fila.categoria] = 'El límite es demasiado grande.'; continue; }
      if (Math.round(limite * 100) !== limite * 100) { fallos[fila.categoria] = 'Como máximo dos decimales.'; continue; }

      if (anterior !== limite) aGuardar.push({ categoria: fila.categoria, presupuesto: limite });
    }

    return { fallos, aGuardar };
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const { fallos, aGuardar } = revisar();

    if (Object.keys(fallos).length > 0) {
      setErrores(fallos);
      setErrorGeneral('Revisa las categorías marcadas.');
      return;
    }

    // Si una categoria marcada para borrar se volvio a agregar despues, ya no cuenta:
    // agregarFila/cambiarCategoria la sacan de aEliminar, pero esto es la comprobacion
    // final antes de mandar nada a la red.
    const categoriasActuales = new Set(filas.map((f) => f.categoria));
    const pendientesDeEliminar = [...aEliminar].filter((categoria) => !categoriasActuales.has(categoria));

    if (aGuardar.length === 0 && pendientesDeEliminar.length === 0) { onCerrar(); return; }

    setErrores({});
    setErrorGeneral('');
    setGuardando(true);
    try {
      const tareas: Promise<unknown>[] = [];
      if (aGuardar.length > 0) tareas.push(onGuardar(aGuardar));
      for (const categoria of pendientesDeEliminar) tareas.push(onEliminar(categoria));
      await Promise.all(tareas);
      onCerrar();
    } catch (fallo) {
      setErrorGeneral(fallo instanceof Error ? fallo.message : 'No fue posible guardar los cambios.');
      setGuardando(false);
    }
  }

  return (
    /*
     * Se monta en document.body: dentro de la pagina, `position: fixed` no se resuelve
     * contra la ventana si algun ancestro tiene `transform`, y .page-stack lleva una
     * animacion de entrada que lo tiene. El resultado era un dialogo centrado contra el
     * area de contenido, con la barra lateral fuera del velo.
     *
     * No se cierra al pulsar fuera: un clic despistado en el velo se lleva por delante lo
     * escrito. Se sale por la X, por Cancelar o con Escape.
     */
    createPortal(
      <div className="fa-modal-velo pre-dialogo">
        <div className="fa-modal crece" ref={modal} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
          <header className="fa-modal-cabecera">
            <div>
              <h2 id={idTitulo}>Editar presupuesto</h2>
              {/* El periodo se muestra pero no se edita: lo gobierna el encabezado, y dos
                  sitios donde elegir el mismo mes es un sitio de mas donde equivocarse. */}
              <p className="fa-modal-sub pre-periodo">{periodo}</p>
            </div>
            <button type="button" className="fa-modal-cerrar" aria-label="Cerrar" onClick={onCerrar}>
              <X size={18} />
            </button>
          </header>

          {/*
            * noValidate: la validacion la hace revisar(), no el navegador. Con la nativa
            * activa, un monto con tres decimales o negativo no llegaba al submit y el
            * mensaje salia en una burbuja del navegador, mientras el resto de errores se
            * pintaba bajo su fila. Dos formas de avisar del mismo tipo de fallo.
            */}
          <form className="fa-modal-form" onSubmit={enviar} noValidate>
            <div className="fa-modal-cuerpo pre-editor">
              {periodoSeMovio && (
                <p className="pre-aviso" role="status">
                  <Info size={15} />
                  El período del encabezado cambió. Este formulario sigue editando <strong>{periodo}</strong>.
                </p>
              )}

              <div className="pre-filas">
                <div className="pre-filas-cabecera" aria-hidden="true">
                  <span>Categoría</span>
                  <span>Límite mensual</span>
                </div>

                {filas.map((fila) => {
                  const etiqueta = etiquetasCategoria[fila.categoria];
                  const fallo = errores[fila.categoria];
                  const enfocada = fila.categoria === categoriaInicial;
                  return (
                    <div key={fila.categoria} className={`pre-linea ${fallo ? 'con-error' : ''}`}>
                      {fila.nueva ? (
                        <select
                          aria-label="Categoría"
                          value={fila.categoria}
                          onChange={(evento) => cambiarCategoria(fila.categoria, evento.target.value as CategoriaFinanciera)}
                        >
                          {/* Solo lo que no esta ya en el presupuesto ni en otra fila
                              nueva: el duplicado se evita antes de llegar al backend. */}
                          <option value={fila.categoria}>{etiqueta}</option>
                          {disponibles.map((id) => (
                            <option key={id} value={id}>{etiquetasCategoria[id]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="pre-linea-nombre">{etiqueta}</span>
                      )}

                      <span className="pre-monto-campo">
                        <span aria-hidden="true">$</span>
                        <input
                          ref={enfocada ? campoInicial : undefined}
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          placeholder="Sin límite"
                          aria-label={`Límite de ${etiqueta}`}
                          aria-invalid={fallo ? true : undefined}
                          value={fila.monto}
                          onChange={(evento) => escribirMonto(fila.categoria, evento.target.value)}
                        />
                      </span>

                      {/* Quitar aqui es siempre local (ver quitarFila): el DELETE real, si corresponde, recien viaja al pulsar "Guardar presupuesto". */}
                      <button
                        type="button"
                        className="pre-quitar"
                        aria-label={`Quitar ${etiqueta}`}
                        onClick={() => quitarFila(fila.categoria)}
                      >
                        <X size={15} />
                      </button>

                      {fallo && <span className="fa-campo-error">{fallo}</span>}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="pre-agregar"
                onClick={agregarFila}
                disabled={disponibles.length === 0}
              >
                <Plus size={15} />
                {disponibles.length === 0 ? 'Todas las categorías tienen límite' : 'Agregar categoría'}
              </button>

              <p className="pre-cuenta">
                {conMonto === 1 ? '1 categoría con presupuesto' : `${conMonto} categorías con presupuesto`}
              </p>
            </div>

            <div className="fa-modal-pie">
              {errorGeneral && (
                <p className="pre-error" role="alert">
                  <WarningCircle size={15} /> {errorGeneral}
                </p>
              )}
              <button type="submit" className="fa-modal-cta" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar presupuesto'}
              </button>
              <button type="button" className="fa-modal-cancelar" onClick={onCerrar}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )
  );
}

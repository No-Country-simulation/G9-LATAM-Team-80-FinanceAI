import {
  ArrowClockwise,
  ArrowDown,
  ArrowUp,
  ListBullets,
  MagnifyingGlass,
  PiggyBank,
  PencilSimple,
  Plus,
  Receipt,
  Trash,
  UploadSimple,
  WarningCircle,
  X
} from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { formatCurrency } from '../../../compartido/utilidades/formato';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { ModalImportar } from './ModalImportar';
import { ModalTransaccion, type DatosTransaccion } from './ModalTransaccion';
import './transacciones.css';

const ETIQUETAS_TIPO: Record<TipoTransaccion, string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  ahorro: 'Ahorro'
};

/** "2026-08" -> "agosto de 2026". */
function nombreDePeriodo(mes: string | null): string {
  if (!mes) return 'este periodo';
  const [anio, numero] = mes.split('-').map(Number);
  const largo = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(anio, numero - 1, 1));
  return `${largo} de ${anio}`;
}

/** Dia y mes corto para la columna izquierda de la fila. */
function partesDeFecha(fecha: string) {
  const referencia = new Date(`${fecha}T00:00:00`);
  const mes = new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(referencia).replace('.', '');
  return { dia: String(referencia.getDate()).padStart(2, '0'), mes, anio: referencia.getFullYear() };
}

function normalizar(texto: string) {
  // Sin tildes ni mayusculas: buscar "nomina" debe encontrar "Nómina".
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

type Panel = { modo: 'cerrado' } | { modo: 'nueva' } | { modo: 'editar'; transaccion: Transaccion } | { modo: 'importar' };

export function TransactionsPage({ workspace }: PageProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaFinanciera | 'todas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<TipoTransaccion | 'todos'>('todos');
  const [panel, setPanel] = useState<Panel>({ modo: 'cerrado' });
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');
  const [errorAccion, setErrorAccion] = useState('');
  const [avisoPeriodo, setAvisoPeriodo] = useState('');

  const { transacciones, transaccionesDelMes, mesAnalizado, mesesConMovimientos, seleccionarMes, cargandoDatos, hidratado } = workspace;
  const periodo = nombreDePeriodo(mesAnalizado);

  const hayFiltros = busqueda.trim() !== '' || filtroCategoria !== 'todas' || filtroTipo !== 'todos';

  /*
   * Busqueda y filtros corren sobre lo que ya esta en memoria: el backend devuelve el
   * historico completo en una sola llamada, asi que no hay que pedir nada mas. Tampoco
   * hay paginacion, ni real ni simulada.
   */
  const visibles = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return transaccionesDelMes
      .filter((item) => (filtroCategoria === 'todas' ? true : item.categoria === filtroCategoria))
      .filter((item) => (filtroTipo === 'todos' ? true : item.tipo === filtroTipo))
      .filter((item) => (termino === '' ? true : normalizar(item.descripcion).includes(termino)))
      .slice()
      .sort((uno, otro) => otro.fecha.localeCompare(uno.fecha));
  }, [transaccionesDelMes, filtroCategoria, filtroTipo, busqueda]);

  /*
   * Cada tipo se suma por separado. Meter el ahorro dentro de los gastos inflaba la
   * cifra y sugeria que transferir a una cuenta de ahorro es dinero perdido.
   */
  const totales = useMemo(() => {
    const suma = { ingresos: 0, gastos: 0, ahorro: 0 };
    for (const item of visibles) {
      const monto = Math.abs(item.monto);
      if (item.tipo === 'ingreso') suma.ingresos += monto;
      else if (item.tipo === 'ahorro') suma.ahorro += monto;
      else suma.gastos += monto;
    }
    return suma;
  }, [visibles]);

  /*
   * Con la lista atada al periodo global, buscar algo de otro mes devuelve cero y
   * parece que el movimiento se perdio. Como las transacciones ya estan todas en
   * memoria, se cuentan las coincidencias de afuera y se ofrece el salto.
   */
  const coincidenciasFuera = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    if (termino === '') return 0;
    return transacciones.filter(
      (item) => !item.fecha.startsWith(mesAnalizado ?? '') && normalizar(item.descripcion).includes(termino)
    ).length;
  }, [transacciones, mesAnalizado, busqueda]);

  /** Periodo mas reciente, distinto del actual, que si tiene movimientos. */
  const periodoConDatos = useMemo(
    () => mesesConMovimientos.find((mes) => mes !== mesAnalizado) ?? null,
    [mesesConMovimientos, mesAnalizado]
  );

  function limpiarFiltros() {
    setBusqueda('');
    setFiltroCategoria('todas');
    setFiltroTipo('todos');
  }

  function cerrarPanel() {
    setPanel({ modo: 'cerrado' });
    setErrorGuardado('');
  }

  async function guardar(datos: DatosTransaccion) {
    setGuardando(true);
    setErrorGuardado('');
    try {
      if (panel.modo === 'editar') {
        await workspace.actualizarTransaccion(panel.transaccion.id, datos);
      } else {
        await workspace.agregarTransaccion(datos);
      }
      /*
       * La fecha es editable y la lista respeta el periodo, asi que guardar puede sacar
       * la fila de la pantalla. Sin este aviso pareceria que se borro.
       */
      setAvisoPeriodo(
        mesAnalizado && !datos.fecha.startsWith(mesAnalizado)
          ? `Guardado. Este movimiento ahora pertenece a ${nombreDePeriodo(datos.fecha.slice(0, 7))}.`
          : ''
      );
      cerrarPanel();
    } catch (fallo) {
      // El panel no se cierra: lo escrito se conserva y se puede reintentar.
      setErrorGuardado(fallo instanceof Error ? fallo.message : 'No fue posible guardar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    setErrorAccion('');
    try {
      await workspace.eliminarTransaccion(id);
      setConfirmando(null);
    } catch (fallo) {
      setErrorAccion(fallo instanceof Error ? fallo.message : 'No fue posible eliminar el movimiento.');
    }
  }

  async function importar(filas: Omit<Transaccion, 'id'>[]) {
    await workspace.importarTransacciones(filas);
    return filas.length;
  }

  return (
    <section className="transacciones">
      <header className="tx-cabecera">
        <div>
          <h1>Transacciones</h1>
          <p>Consulta y organiza los movimientos de tu dinero.</p>
        </div>
        <button type="button" className="tx-boton primario" onClick={() => setPanel({ modo: 'nueva' })}>
          <Plus size={17} /> Nueva transacción
        </button>
      </header>

      <div className="tx-contexto">
        <span className="tx-cifra">
          {/* aria-hidden: el icono repite lo que ya dice la etiqueta de al lado. */}
          <span className="tx-cifra-icono movimientos" aria-hidden="true"><ListBullets size={17} /></span>
          <span className="tx-cifra-texto">
            <strong>
              {hayFiltros && visibles.length !== transaccionesDelMes.length
                ? <>{visibles.length} de {transaccionesDelMes.length} movimientos</>
                : <>{visibles.length} {visibles.length === 1 ? 'movimiento' : 'movimientos'}</>}
            </strong>
            <small className="tx-cifra-periodo">en {periodo}</small>
          </span>
        </span>
        {(totales.ingresos > 0 || totales.gastos > 0 || totales.ahorro > 0) && <span className="tx-separador" />}
        {totales.ingresos > 0 && (
          <span className="tx-cifra">
            <span className="tx-cifra-icono ingreso" aria-hidden="true"><ArrowUp size={17} /></span>
            <span className="tx-cifra-texto"><small>Ingresos</small><strong>{formatCurrency(totales.ingresos)}</strong></span>
          </span>
        )}
        {totales.gastos > 0 && (
          <span className="tx-cifra">
            <span className="tx-cifra-icono gasto" aria-hidden="true"><ArrowDown size={17} /></span>
            <span className="tx-cifra-texto"><small>Gastos</small><strong>{formatCurrency(totales.gastos)}</strong></span>
          </span>
        )}
        {totales.ahorro > 0 && (
          <span className="tx-cifra">
            <span className="tx-cifra-icono ahorro" aria-hidden="true"><PiggyBank size={17} /></span>
            <span className="tx-cifra-texto"><small>Ahorro</small><strong>{formatCurrency(totales.ahorro)}</strong></span>
          </span>
        )}
      </div>

      <div className="tx-controles">
        <div className="tx-busqueda">
          <MagnifyingGlass size={17} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por descripción"
            aria-label="Buscar por descripción"
          />
        </div>

        <select
          className={`tx-filtro ${filtroCategoria !== 'todas' ? 'activo' : ''}`}
          value={filtroCategoria}
          onChange={(evento) => setFiltroCategoria(evento.target.value as CategoriaFinanciera | 'todas')}
          aria-label="Filtrar por categoría"
        >
          <option value="todas">Todas las categorías</option>
          {Object.entries(etiquetasCategoria).map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
        </select>

        <select
          className={`tx-filtro ${filtroTipo !== 'todos' ? 'activo' : ''}`}
          value={filtroTipo}
          onChange={(evento) => setFiltroTipo(evento.target.value as TipoTransaccion | 'todos')}
          aria-label="Filtrar por tipo"
        >
          <option value="todos">Todos los tipos</option>
          {Object.entries(ETIQUETAS_TIPO).map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
        </select>

        {hayFiltros && (
          <button type="button" className="tx-enlace tx-limpiar" onClick={limpiarFiltros}>
            <X size={15} /> Limpiar filtros
          </button>
        )}

        <div className="tx-derecha">
          <button type="button" className="tx-boton secundario" onClick={() => setPanel({ modo: 'importar' })}>
            <UploadSimple size={17} /> Importar CSV
          </button>
        </div>
      </div>

      {avisoPeriodo && (
        <div className="tx-aviso" role="status">
          <p>{avisoPeriodo}</p>
          <button type="button" className="tx-icono" aria-label="Descartar aviso" onClick={() => setAvisoPeriodo('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {errorAccion && (
        <div className="tx-aviso problema" role="alert">
          <WarningCircle size={18} />
          <p>{errorAccion}</p>
          <button type="button" className="tx-icono" aria-label="Descartar error" onClick={() => setErrorAccion('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {cargandoDatos && !hidratado ? (
        <Esqueleto />
      ) : visibles.length > 0 ? (
        <div className="tx-tabla">
          <div className="tx-encabezado" role="row">
            <span role="columnheader">Fecha</span>
            <span role="columnheader">Movimiento</span>
            <span role="columnheader">Tipo</span>
            <span role="columnheader">Clasificación</span>
            <span role="columnheader" className="tx-col-monto">Monto</span>
            <span role="columnheader" className="tx-col-acciones">Acciones</span>
          </div>
          <ul className="tx-lista">
          {visibles.map((item) => (
            <Fila
              key={item.id}
              transaccion={item}
              confirmando={confirmando === item.id}
              resaltada={panel.modo === 'editar' && panel.transaccion.id === item.id}
              onEditar={() => setPanel({ modo: 'editar', transaccion: item })}
              onPedirEliminar={() => setConfirmando(item.id)}
              onCancelarEliminar={() => setConfirmando(null)}
              onConfirmarEliminar={() => eliminar(item.id)}
            />
          ))}
          </ul>
        </div>
      ) : hayFiltros ? (
        <SinResultados
          coincidenciasFuera={coincidenciasFuera}
          onLimpiar={limpiarFiltros}
          onVerTodo={() => { limpiarFiltros(); if (periodoConDatos) seleccionarMes(periodoConDatos); }}
        />
      ) : (
        <SinMovimientos
          periodo={periodo}
          periodoConDatos={periodoConDatos}
          onNueva={() => setPanel({ modo: 'nueva' })}
          onImportar={() => setPanel({ modo: 'importar' })}
          onIrAlPeriodo={() => periodoConDatos && seleccionarMes(periodoConDatos)}
        />
      )}

      {panel.modo === 'nueva' && (
        <ModalTransaccion
          transaccion={null}
          guardando={guardando}
          errorGuardado={errorGuardado}
          onClasificar={workspace.clasificarDescripcion}
          onGuardar={guardar}
          onCerrar={cerrarPanel}
        />
      )}
      {panel.modo === 'editar' && (
        <ModalTransaccion
          key={panel.transaccion.id}
          transaccion={panel.transaccion}
          guardando={guardando}
          errorGuardado={errorGuardado}
          onClasificar={workspace.clasificarDescripcion}
          onGuardar={guardar}
          onCerrar={cerrarPanel}
        />
      )}
      {panel.modo === 'importar' && (
        <ModalImportar
          onClasificarLote={workspace.clasificarDescripciones}
          onImportar={importar}
          onCerrar={cerrarPanel}
        />
      )}
    </section>
  );
}

function Fila({
  transaccion,
  confirmando,
  resaltada,
  onEditar,
  onPedirEliminar,
  onCancelarEliminar,
  onConfirmarEliminar
}: {
  transaccion: Transaccion;
  confirmando: boolean;
  resaltada: boolean;
  onEditar: () => void;
  onPedirEliminar: () => void;
  onCancelarEliminar: () => void;
  onConfirmarEliminar: () => void;
}) {
  const { dia, mes, anio } = partesDeFecha(transaccion.fecha);
  const tipo = transaccion.tipo;

  return (
    <li className={`tx-fila ${confirmando ? 'confirmando' : ''} ${resaltada ? 'resaltada' : ''}`}>
      <div className="tx-fecha">{dia} {mes} {anio}</div>

      {/* title solo se ve si el texto se recorta: el navegador lo ignora cuando cabe. */}
      <div className="tx-desc" title={transaccion.descripcion}>{transaccion.descripcion}</div>

      <div className="tx-celda">
        <span className={`tx-pill-tipo ${tipo}`}>{ETIQUETAS_TIPO[tipo]}</span>
      </div>

      <div className="tx-celda">
        {/*
          La clasificacion pertenece a los gastos. En un ingreso o un ahorro no hay nada
          que mostrar: una raya lo dice sin fingir una categoria que nadie asigno.
        */}
        {transaccion.categoria
          ? <span className="tx-pill">{etiquetasCategoria[transaccion.categoria]}</span>
          : <span className="tx-vacio" role="img" aria-label="Sin clasificación">—</span>}
      </div>

      {confirmando ? (
        <div className="tx-confirmar">
          <p>¿Eliminar este movimiento?</p>
          <button type="button" className="tx-mini" onClick={onCancelarEliminar}>Cancelar</button>
          <button type="button" className="tx-mini peligro" onClick={onConfirmarEliminar}>Eliminar</button>
        </div>
      ) : (
        <>
          <div className={`tx-monto ${tipo}`}>
            {tipo === 'ingreso' ? '+ ' : ''}{formatCurrency(Math.abs(transaccion.monto))}
          </div>

          <div className="tx-acciones">
            <button
              type="button"
              className="tx-icono"
              aria-label={`Editar ${transaccion.descripcion}`}
              title="Editar"
              onClick={onEditar}
            >
              <PencilSimple size={17} />
            </button>
            <button
              type="button"
              className="tx-icono peligro"
              aria-label={`Eliminar ${transaccion.descripcion}`}
              title="Eliminar"
              onClick={onPedirEliminar}
            >
              <Trash size={17} />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

/** Esqueleto con la geometria real de la fila, para que la lista no salte al cargar. */
function Esqueleto() {
  const anchos = [
    { desc: '44%', meta: '26%', monto: 104 },
    { desc: '58%', meta: '31%', monto: 118 },
    { desc: '37%', meta: '22%', monto: 96 },
    { desc: '50%', meta: '28%', monto: 110 },
    { desc: '41%', meta: '24%', monto: 92 }
  ];
  return (
    <ul className="tx-lista" aria-busy="true" aria-label="Cargando movimientos">
      {anchos.map((fila, indice) => (
        <li className="tx-fila" key={indice}>
          <div className="tx-fecha"><div className="tx-esqueleto" style={{ height: 30, width: 44 }} /></div>
          <div className="tx-desc">
            <div className="tx-esqueleto" style={{ height: 14, width: fila.desc }} />
            <div className="tx-esqueleto" style={{ height: 11, width: fila.meta, marginTop: 8 }} />
          </div>
          <div className="tx-monto"><div className="tx-esqueleto" style={{ height: 14, width: fila.monto }} /></div>
          <div />
        </li>
      ))}
    </ul>
  );
}

function SinResultados({
  coincidenciasFuera,
  onLimpiar,
  onVerTodo
}: {
  coincidenciasFuera: number;
  onLimpiar: () => void;
  onVerTodo: () => void;
}) {
  return (
    <div className="tx-estado">
      <div className="tx-estado-simbolo"><MagnifyingGlass size={23} /></div>
      <h2>Ningún movimiento coincide con tu búsqueda</h2>
      <p>Prueba con otra descripción o quita los filtros para ver todo el período.</p>
      <div className="tx-estado-acciones">
        <button type="button" className="tx-boton secundario" onClick={onLimpiar}>Limpiar filtros</button>
      </div>
      {coincidenciasFuera > 0 && (
        <p className="tx-pista">
          Hay <strong>{coincidenciasFuera} {coincidenciasFuera === 1 ? 'movimiento' : 'movimientos'}</strong> que
          {coincidenciasFuera === 1 ? ' coincide' : ' coinciden'} en otros periodos.{' '}
          <button type="button" className="tx-enlace" onClick={onVerTodo}>Buscar en otro período</button>
        </p>
      )}
    </div>
  );
}

function SinMovimientos({
  periodo,
  periodoConDatos,
  onNueva,
  onImportar,
  onIrAlPeriodo
}: {
  periodo: string;
  periodoConDatos: string | null;
  onNueva: () => void;
  onImportar: () => void;
  onIrAlPeriodo: () => void;
}) {
  return (
    <div className="tx-estado">
      <div className="tx-estado-simbolo"><Receipt size={24} /></div>
      <h2>Aún no tienes movimientos en {periodo}</h2>
      <p>Agrega una transacción o importa tus movimientos para empezar a analizarlos.</p>
      <div className="tx-estado-acciones">
        <button type="button" className="tx-boton primario" onClick={onNueva}><Plus size={17} /> Nueva transacción</button>
        <button type="button" className="tx-boton secundario" onClick={onImportar}><UploadSimple size={17} /> Importar CSV</button>
      </div>
      {periodoConDatos && (
        <p className="tx-pista">
          Sí tienes movimientos en <strong>{nombreDePeriodo(periodoConDatos)}</strong>.{' '}
          <button type="button" className="tx-enlace" onClick={onIrAlPeriodo}>
            <ArrowClockwise size={13} style={{ verticalAlign: '-1px' }} /> Ver ese periodo
          </button>
        </p>
      )}
    </div>
  );
}

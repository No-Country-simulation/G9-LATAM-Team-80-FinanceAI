import {
  Briefcase, Car, ChartBar, CreditCard, DotsThreeOutline, FilmSlate, ForkKnife,
  GraduationCap, Heartbeat, House, PawPrint, PencilSimple, Plus, Receipt, Scissors,
  ShieldCheck, Target
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { coloresCategoria, etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { CategoriaFinanciera, PresupuestoCategoria } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { PageHeader } from '../../tablero/presentacion/DashboardPage';
import { ModalPresupuesto } from './ModalPresupuesto';
import type { LimiteAGuardar } from './ModalPresupuesto';
import './presupuesto.css';

/**
 * Una linea de la tabla.
 *
 * "limite" es null cuando la categoria tiene gasto pero nadie le ha puesto tope: no es
 * un limite de cero. Calcular un porcentaje contra cero daba cifras como 36.666%, que no
 * significaban "te pasaste muchisimo" sino "no hay con que comparar".
 */
type Linea = {
  categoria: CategoriaFinanciera;
  limite: number | null;
  gastado: number;
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Icono por categoria.
 *
 * Vive aqui, en la unica pantalla que lo usa, y no en compartido/constantes: el resto de
 * la aplicacion todavia no pide iconos por categoria. El dia que Transacciones o Analisis
 * los necesiten, este mapa sube junto a etiquetasCategoria y coloresCategoria.
 */
const ICONOS: Record<CategoriaFinanciera, JSX.Element> = {
  profesionales: <Briefcase size={17} weight="duotone" />,
  mascotas: <PawPrint size={17} weight="duotone" />,
  alimentacion: <ForkKnife size={17} weight="duotone" />,
  transporte: <Car size={17} weight="duotone" />,
  vivienda: <House size={17} weight="duotone" />,
  entretenimiento: <FilmSlate size={17} weight="duotone" />,
  salud: <Heartbeat size={17} weight="duotone" />,
  educacion: <GraduationCap size={17} weight="duotone" />,
  deudas: <CreditCard size={17} weight="duotone" />,
  impuestos_y_seguros: <ShieldCheck size={17} weight="duotone" />,
  cuidado_personal: <Scissors size={17} weight="duotone" />,
  otros: <DotsThreeOutline size={17} weight="duotone" />
};

/** "2026-08" -> "agosto 2026". El periodo manda en toda la pantalla. */
function nombreDelPeriodo(periodo: string | null) {
  if (!periodo) return 'este mes';
  const mes = MESES[Number(periodo.slice(5, 7)) - 1];
  return mes ? `${mes} ${periodo.slice(0, 4)}` : 'este mes';
}

/** "2026-08" -> "agosto de 2026". Solo para el subtitulo del modal. */
function periodoEnPalabras(periodo: string | null) {
  if (!periodo) return 'este mes';
  const mes = MESES[Number(periodo.slice(5, 7)) - 1];
  return mes ? `${mes} de ${periodo.slice(0, 4)}` : 'este mes';
}

function soloMes(periodo: string | null) {
  if (!periodo) return 'este mes';
  return MESES[Number(periodo.slice(5, 7)) - 1] ?? 'este mes';
}

export function BudgetsPage({ workspace }: PageProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaInicial, setCategoriaInicial] = useState<CategoriaFinanciera | undefined>();
  /*
   * El periodo y los limites se congelan al abrir el formulario. Si alguien mueve el
   * selector del encabezado mientras esta abierto, lo que se guarda sigue siendo el mes
   * que el titulo dice estar editando, y no el que el encabezado marque al pulsar.
   */
  const [periodoDelModal, setPeriodoDelModal] = useState<string | null>(null);
  const [limitesDelModal, setLimitesDelModal] = useState<PresupuestoCategoria[]>([]);

  const { presupuestos, transaccionesDelMes, mesAnalizado } = workspace;

  /*
   * La API solo devuelve las categorias que tienen limite en ESTE periodo. Una con gasto
   * y sin limite no aparecia en ninguna parte, asi que el dinero se veia en Transacciones
   * pero no aqui. Se cruzan las dos fuentes: los limites del periodo y su gasto real.
   */
  const { conLimite, sinLimite } = useMemo(() => {
    const gastoPorCategoria = new Map<CategoriaFinanciera, number>();
    transaccionesDelMes.forEach((movimiento) => {
      if (movimiento.tipo !== 'gasto' || !movimiento.categoria) return;
      const acumulado = gastoPorCategoria.get(movimiento.categoria) ?? 0;
      gastoPorCategoria.set(movimiento.categoria, acumulado + Math.abs(movimiento.monto));
    });

    const con: Linea[] = presupuestos
      .map((item) => ({
        categoria: item.categoria,
        limite: item.presupuesto,
        gastado: gastoPorCategoria.get(item.categoria) ?? 0
      }))
      .sort((a, b) => (b.limite ?? 0) - (a.limite ?? 0));

    /*
     * Solo las que tienen gasto. Una categoria sin limite y sin movimientos no aporta
     * nada: seria una lista de doce filas vacias cada mes.
     */
    const sin: Linea[] = [...gastoPorCategoria.entries()]
      .filter(([categoria]) => !presupuestos.some((item) => item.categoria === categoria))
      .map(([categoria, gastado]) => ({ categoria, limite: null, gastado }))
      .sort((a, b) => b.gastado - a.gastado);

    return { conLimite: con, sinLimite: sin };
  }, [presupuestos, transaccionesDelMes]);

  /*
   * Presupuestado y Gastado hablan de la MISMA poblacion: las categorias con limite.
   * Meter en el gastado lo que no tiene plan haria que el porcentaje midiera una cosa
   * contra otra distinta -- con deudas sin limite, el uso saltaria del 92% al 200%.
   */
  const totalLimite = conLimite.reduce((suma, l) => suma + (l.limite ?? 0), 0);
  const totalGastado = conLimite.reduce((suma, l) => suma + l.gastado, 0);
  const disponible = totalLimite - totalGastado;
  const usado = totalLimite > 0 ? (totalGastado / totalLimite) * 100 : 0;
  const excedido = totalLimite > 0 && totalGastado > totalLimite;

  const periodo = nombreDelPeriodo(mesAnalizado);
  const hayPresupuesto = presupuestos.length > 0;
  const hayGastos = transaccionesDelMes.some((m) => m.tipo === 'gasto');

  function abrirModal(categoria?: CategoriaFinanciera) {
    setCategoriaInicial(categoria);
    setPeriodoDelModal(mesAnalizado);
    setLimitesDelModal(presupuestos);
    setModalAbierto(true);
  }

  /* Una sola peticion para todo el mes; el propio hook vuelve a leer el periodo. */
  async function guardar(limites: LimiteAGuardar[]) {
    await workspace.guardarLimites(limites, periodoDelModal);
    setModalAbierto(false);
  }

  /*
   * Distinto de guardar(): es un DELETE inmediato de UNA categoria, no algo que espere al
   * "Guardar presupuesto" del lote. El modal se queda abierto -- puede haber mas cambios
   * pendientes en otras filas.
   */
  function eliminar(categoria: CategoriaFinanciera) {
    return workspace.eliminarLimite(categoria, periodoDelModal);
  }

  return (
    <section className="page-stack presupuesto">
      <PageHeader
        title={`Presupuesto de ${periodo}`}
        subtitle="Planifica tus gastos y controla tu progreso durante el mes."
        action={hayPresupuesto ? (
          <button type="button" className="pre-boton primario" onClick={() => abrirModal()}>
            <PencilSimple size={16} /> Editar presupuesto
          </button>
        ) : undefined}
      />

      {!hayPresupuesto ? (
        <SinPresupuesto mes={soloMes(mesAnalizado)} hayGastos={hayGastos} onCrear={() => abrirModal()} />
      ) : (
        <>
          <ResumenMensual
            limite={totalLimite}
            gastado={totalGastado}
            disponible={disponible}
            usado={usado}
            excedido={excedido}
          />

          <div className="pre-columnas">
            <Categorias conLimite={conLimite} sinLimite={sinLimite} onDefinir={abrirModal} />
            {/*
              * El lateral es secundario y se queda solo con la ayuda. "Mayor uso del
              * presupuesto" repetia la primera fila de la tabla, que ya viene ordenada
              * por limite: el mismo dato aparecia dos veces en la misma pantalla.
              */}
            <aside className="pre-lateral">
              <ComoFunciona />
            </aside>
          </div>
        </>
      )}

      {modalAbierto && (
        <ModalPresupuesto
          periodo={periodoEnPalabras(periodoDelModal)}
          periodoClave={periodoDelModal}
          periodoActual={mesAnalizado}
          categoriaInicial={categoriaInicial}
          presupuestos={limitesDelModal}
          onGuardar={guardar}
          onEliminar={eliminar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Resumen mensual                                                     */
/* ------------------------------------------------------------------ */

function ResumenMensual({ limite, gastado, disponible, usado, excedido }: {
  limite: number; gastado: number; disponible: number; usado: number; excedido: boolean;
}) {
  const disponiblePct = Math.max(0, 100 - usado);

  return (
    <article className="pre-resumen">
      <div className="pre-resumen-principal">
        <h2>Resumen mensual</h2>

        <dl className="pre-cifras">
          <div>
            <dt>Presupuestado</dt>
            <dd>{formatCurrency(limite)}</dd>
            <small>Límite total definido</small>
          </div>
          <div>
            <dt>Gastado</dt>
            <dd>{formatCurrency(gastado)}</dd>
            <small>{formatPercent(usado)} utilizado</small>
          </div>
          <div>
            <dt>Disponible</dt>
            {/* En rojo cuando es negativo. Antes iba siempre en verde, asi que un saldo
                de -1.557.600 se leia como si sobrara dinero. */}
            <dd className={disponible < 0 ? 'tono-riesgo' : 'tono-sano'}>{formatCurrency(disponible)}</dd>
            <small>{excedido ? 'por encima del límite' : `${formatPercent(disponiblePct)} disponible`}</small>
          </div>
        </dl>

        <div className="pre-avance">
          <Barra porcentaje={usado} excedido={excedido} />
          <span>{formatPercent(usado)} utilizado</span>
        </div>
      </div>

      <div className="pre-estado">
        <p className="pre-eyebrow">Estado del período</p>
        {/*
          * Solo dos estados, y los dos salen de la aritmetica: o el gasto cabe en el
          * limite o no cabe. No hay en el proyecto ninguna regla que defina "cerca del
          * limite", asi que no se inventa un umbral aqui.
          */}
        <span className={`pre-pill ${excedido ? 'riesgo' : 'sano'}`}>
          {excedido ? 'Excedido' : 'Dentro del presupuesto'}
        </span>
        <p className="pre-estado-texto">
          {excedido
            ? <>Has superado tu presupuesto en <strong>{formatCurrency(Math.abs(disponible))}</strong>.</>
            : <>Te quedan <strong>{formatCurrency(disponible)}</strong> para el resto del mes.</>}
        </p>
      </div>
    </article>
  );
}

/**
 * Barra de avance.
 *
 * El relleno se corta en el 100%: dibujar una barra tres veces y media mas larga que su
 * carril no cabe en ningun sitio. El porcentaje real se lee al lado.
 */
function Barra({ porcentaje, excedido }: { porcentaje: number; excedido: boolean }) {
  const ancho = Math.min(100, Math.max(0, porcentaje));
  return (
    <div className={`pre-barra ${excedido ? 'excedido' : ''}`} role="presentation">
      <span style={{ width: `${ancho}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presupuesto por categoria                                           */
/* ------------------------------------------------------------------ */

function Categorias({ conLimite, sinLimite, onDefinir }: {
  conLimite: Linea[];
  sinLimite: Linea[];
  onDefinir: (categoria: CategoriaFinanciera) => void;
}) {
  return (
    <section className="pre-categorias">
      <h2>Presupuesto por categoría</h2>

      <div className="pre-tabla" role="table">
        <div className="pre-cabecera" role="row">
          <span role="columnheader">Categoría</span>
          <span role="columnheader">Límite mensual</span>
          <span role="columnheader">Gastado</span>
          <span role="columnheader">Disponible</span>
          <span role="columnheader">Uso</span>
        </div>

        {conLimite.map((linea) => (
          <FilaConLimite key={linea.categoria} linea={linea} onEditar={onDefinir} />
        ))}

        {sinLimite.length > 0 && (
          <>
            <p className="pre-subtitulo">Categorías sin límite definido</p>
            {sinLimite.map((linea) => (
              <FilaSinLimite key={linea.categoria} linea={linea} onDefinir={onDefinir} />
            ))}
          </>
        )}
      </div>

      <p className="pre-pie">
        Los porcentajes se calculan sobre el límite de cada categoría. Las categorías sin
        límite no afectan al resumen mensual.
      </p>
    </section>
  );
}

/** Icono de la categoria sobre su propio color, en pastel muy suave. */
function Icono({ categoria }: { categoria: CategoriaFinanciera }) {
  return (
    <span
      className="pre-icono"
      style={{ background: `${coloresCategoria[categoria]}14`, color: coloresCategoria[categoria] }}
      aria-hidden="true"
    >
      {ICONOS[categoria]}
    </span>
  );
}

function FilaConLimite({ linea, onEditar }: {
  linea: Linea;
  onEditar: (categoria: CategoriaFinanciera) => void;
}) {
  const limite = linea.limite ?? 0;
  const restante = limite - linea.gastado;
  const uso = limite > 0 ? (linea.gastado / limite) * 100 : 0;
  const excedida = linea.gastado > limite;

  return (
    <div className={`pre-fila ${excedida ? 'excedida' : ''}`} role="row">
      <span className="pre-categoria" role="cell">
        <Icono categoria={linea.categoria} />
        <span>
          {/*
            * El nombre abre el limite de esa categoria. Es un boton, pero se pinta como
            * el texto que sustituye: la fila conserva su alto y su reja, y la accion
            * queda alcanzable con el teclado.
            */}
          <button
            type="button"
            className="pre-editar"
            onClick={() => onEditar(linea.categoria)}
          >
            {etiquetasCategoria[linea.categoria]}
          </button>
          {excedida && <small className="tono-riesgo">Excedido</small>}
        </span>
      </span>
      <span className="pre-monto pre-solo-tabla" role="cell" data-etiqueta="Límite">{formatCurrency(limite)}</span>
      <span className="pre-monto pre-solo-tabla" role="cell" data-etiqueta="Gastado">{formatCurrency(linea.gastado)}</span>
      <span className={`pre-monto ${restante < 0 ? 'tono-riesgo' : 'tono-sano'}`} role="cell" data-etiqueta="Disponible">
        {formatCurrency(restante)}
      </span>
      <span className="pre-uso" role="cell">{formatPercent(uso)}</span>
      {/*
        * Solo en movil: en una columna, "1.250.000 de 1.300.000" se lee de un golpe y
        * ahorra dos filas etiquetadas. En la tabla ancha esas dos cifras ya tienen cada
        * una su columna, asi que ahi sobra.
        */}
      <span className="pre-movil-resumen" aria-hidden="true">
        {formatCurrency(linea.gastado)} de {formatCurrency(limite)}
      </span>
      <Barra porcentaje={uso} excedido={excedida} />
    </div>
  );
}

function FilaSinLimite({ linea, onDefinir }: {
  linea: Linea;
  onDefinir: (categoria: CategoriaFinanciera) => void;
}) {
  return (
    <div className="pre-fila sin-limite" role="row">
      <span className="pre-categoria" role="cell">
        <Icono categoria={linea.categoria} />
        <span>
          {etiquetasCategoria[linea.categoria]}
          <small>Sin presupuesto definido</small>
        </span>
      </span>
      {/* Sin limite no hay porcentaje ni margen: una raya dice mas que un cero. */}
      <span className="pre-monto pre-sin-dato" role="cell" data-etiqueta="Límite">—</span>
      <span className="pre-monto" role="cell" data-etiqueta="Gastado">{formatCurrency(linea.gastado)}</span>
      <span className="pre-monto pre-sin-dato" role="cell" data-etiqueta="Disponible">—</span>
      <span className="pre-uso" role="cell">
        <button type="button" className="pre-chip" onClick={() => onDefinir(linea.categoria)}>
          Definir límite
        </button>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Columna lateral                                                     */
/* ------------------------------------------------------------------ */

const PASOS = [
  { icono: <Target size={15} />, titulo: 'Define un límite', texto: 'Cuánto quieres gastar en cada categoría.' },
  { icono: <Receipt size={15} />, titulo: 'Registra tus gastos', texto: 'Tus movimientos alimentan el seguimiento.' },
  { icono: <ChartBar size={15} />, titulo: 'Controla tu progreso', texto: 'Compara lo planeado con lo real.' }
];

function ComoFunciona() {
  return (
    <article className="pre-ayuda-card">
      <h2>¿Cómo funciona?</h2>
      <ol>
        {PASOS.map((paso) => (
          <li key={paso.titulo}>
            <span className="pre-paso-icono" aria-hidden="true">{paso.icono}</span>
            <span>
              <strong>{paso.titulo}</strong>
              {paso.texto}
            </span>
          </li>
        ))}
      </ol>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Sin presupuesto                                                     */
/* ------------------------------------------------------------------ */

function SinPresupuesto({ mes, hayGastos, onCrear }: {
  mes: string; hayGastos: boolean; onCrear: () => void;
}) {
  return (
    <article className="pre-vacio-estado">
      <span className="pre-vacio-icono" aria-hidden="true"><Target size={24} /></span>
      <h2>Planifica tus gastos de {mes}</h2>
      {/* Cada mes se planifica solo: septiembre no hereda los limites de agosto. */}
      <p>Aún no has definido límites para este período.</p>
      {hayGastos && (
        <p className="pre-vacio-nota">
          Ya tienes movimientos registrados este mes. Define límites para empezar a compararlos.
        </p>
      )}
      <button type="button" className="pre-boton primario" onClick={onCrear}>
        <Plus size={16} /> Crear presupuesto
      </button>
    </article>
  );
}

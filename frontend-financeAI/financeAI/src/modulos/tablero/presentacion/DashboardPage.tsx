import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CaretDown,
  ChartLineUp,
  FileArrowUp,
  PiggyBank,
  Scales,
  TrendDown,
  Wallet
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { coloresCategoria, etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { gastosSinDeudas } from '../../../compartido/servicios/analisisFinanciero.service';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import './dashboard.css';

/** Cuantas categorias se listan antes de agrupar el resto. */
const CATEGORIAS_VISIBLES = 5;

/** Umbrales de endeudamiento del backend (calcular_perfil_reglas): 36% y 43%. */
function estadoEndeudamiento(nivel: number) {
  if (nivel > 43) return { texto: 'Nivel alto', tono: 'riesgo' as const };
  if (nivel >= 36) return { texto: 'Zona de atención', tono: 'atencion' as const };
  return { texto: 'Nivel saludable', tono: 'sano' as const };
}

/** Luces del semaforo, de arriba abajo como en uno real. */
const ETIQUETAS_TIPO_MOVIMIENTO: Record<TipoTransaccion, string> = {
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  ahorro: 'Ahorro'
};

const LUCES = ['riesgo', 'atencion', 'sano'] as const;

/**
 * Titular humano para cada veredicto y su posicion en la escala.
 *
 * No agrega informacion: solo nombra el resultado que ya calculo el backend. Se compara
 * con startsWith porque el ML devuelve "En observacion" con tilde y el tipo del frontend
 * la declara sin ella.
 */
function lecturaDelPerfil(perfil: string) {
  if (perfil.startsWith('En riesgo')) return { frase: 'Esto merece tu atención.', tono: 'riesgo' as const };
  if (perfil.startsWith('En observaci')) return { frase: 'Hay algunos puntos que vale la pena revisar.', tono: 'atencion' as const };
  // Cualquier otro valor cae aqui, asi que una variante como "Sano" tambien da verde.
  return { frase: 'Vas por buen camino.', tono: 'sano' as const };
}

/** Las razones llegan en minuscula desde el backend; aca solo se presentan. */
function comoOracion(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function DashboardPage({ workspace, navegar }: PageProps) {
  const { analisis } = workspace;
  const { resumen: resumenGastos, total: gastoCategorias } = gastosSinDeudas(analisis.resumenGastos);

  const evolucion = useMemo(() => calcularEvolucion(workspace.transacciones), [workspace.transacciones]);

  if (!workspace.hidratado && workspace.cargandoDatos) return <EsqueletoTablero />;
  if (workspace.transacciones.length === 0) return <SinTransacciones onImportar={() => navegar('archivos')} />;

  return (
    <section className="page-stack dashboard">
      <PageHeader title="Resumen financiero" subtitle="Lo más importante de tus finanzas este mes." />

      {workspace.errorAnalisis && (
        <ErrorAnalisis
          onReintentar={() => workspace.generarAnalisis({
            ingresoMensual: workspace.ingresoMensual,
            nivelEndeudamiento: workspace.nivelEndeudamiento,
            frecuenciaAhorro: workspace.frecuenciaAhorro
          })}
        />
      )}

      {workspace.cargandoAnalisis && !workspace.analisisListo
        ? <div className="dash-salud dash-salud-esqueleto" />
        : workspace.analisisListo
          ? <PanelSuperior workspace={workspace} navegar={navegar} />
          : <SinAnalisis />}

      {workspace.analisisListo && (
        <>
          <Kpis workspace={workspace} />

          <div className="dash-columnas">
            <DistribucionGasto resumen={resumenGastos} total={gastoCategorias} />
            <EvolucionGastos puntos={evolucion} />
          </div>
        </>
      )}

      <UltimosMovimientos transacciones={workspace.transacciones} navegar={navegar} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Diagnostico                                                         */
/* ------------------------------------------------------------------ */

/**
 * Panel superior: diagnostico y accion en una sola superficie.
 *
 * Antes eran dos tarjetas separadas y distantes -- Salud Financiera arriba a ancho
 * completo con mucho hueco, y la oportunidad varias secciones mas abajo. Juntarlas
 * responde de una mirada "asi estoy -> esto deberia revisar", y recupera la altura
 * que sobraba en la primera franja.
 */
/*
 * El estado del acordeon vive aqui, no en Diagnostico, porque el detalle desplegado es
 * una tercera fila del panel y no un hijo de la zona izquierda. Anidado dentro de
 * .dash-salud, el detalle solo podia crecer en la columna izquierda y estiraba la
 * columna derecha hasta la misma altura, dejando un hueco blanco bajo la recomendacion.
 */
function PanelSuperior({ workspace, navegar }: { workspace: PageProps['workspace']; navegar: PageProps['navegar'] }) {
  const [detalleVisible, setDetalleVisible] = useState(false);
  const { analisis } = workspace;
  const razones = analisis.razonesPerfil;

  return (
    <article className="dash-panel">
      <Diagnostico
        workspace={workspace}
        detalleVisible={detalleVisible}
        alternarDetalle={() => setDetalleVisible((visible) => !visible)}
      />
      <Oportunidad workspace={workspace} navegar={navegar} />

      {detalleVisible && razones.length > 0 && (
        <div className="dash-salud-detalle" id={ID_DETALLE_SALUD}>
          <section>
            <h3>¿Por qué obtuviste este resultado?</h3>
            <ul>{razones.map((razon) => <li key={razon}>{comoOracion(razon)}</li>)}</ul>
          </section>
          <section>
            <h3>Cómo se determinó</h3>
            <p>El resultado considera tus gastos, tu ahorro y tu nivel de endeudamiento.</p>
            {/* Secundario a proposito: el modelo no decide el perfil, solo coincide o
                no con el veredicto de las reglas. No es un puntaje de salud. */}
            <small>El modelo entrenado coincide con este resultado en un {Math.round(analisis.probabilidad * 100)}%.</small>
          </section>
        </div>
      )}
    </article>
  );
}

/** El boton y el detalle ya no son padre e hijo: los enlaza aria-controls. */
const ID_DETALLE_SALUD = 'dash-detalle-salud';

function Diagnostico({
  workspace,
  detalleVisible,
  alternarDetalle
}: {
  workspace: PageProps['workspace'];
  detalleVisible: boolean;
  alternarDetalle: () => void;
}) {
  const { analisis } = workspace;
  const { frase, tono } = lecturaDelPerfil(analisis.perfilFinanciero);
  const razones = analisis.razonesPerfil;

  return (
    <section className={`dash-salud tono-${tono}`}>
      <Semaforo tono={tono} perfil={analisis.perfilFinanciero} />

      <div className="dash-salud-texto">
        <header className="dash-salud-cabecera">
          <p>Salud financiera</p>
          {/* El estado nunca depende solo del color de la luz: siempre va tambien en texto. */}
          <span className="dash-salud-pill">{analisis.perfilFinanciero}</span>
        </header>

        <h2 className="dash-salud-frase">{frase}</h2>
        {razones[0] && <p className="dash-salud-razon">{comoOracion(razones[0])}</p>}

        {razones.length > 0 && (
          <button
            type="button"
            className={`dash-salud-toggle ${detalleVisible ? 'abierto' : ''}`}
            aria-expanded={detalleVisible}
            aria-controls={ID_DETALLE_SALUD}
            onClick={alternarDetalle}
          >
            Ver por que este resultado <CaretDown size={14} />
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Semaforo del perfil financiero.
 *
 * Reemplaza al indicador lineal de tres posiciones. Las tres luces se ven siempre, en el
 * orden de un semaforo real -- rojo arriba, verde abajo -- y solo una queda encendida,
 * segun el perfil que ya devolvio el backend. No introduce estados ni puntajes nuevos.
 */
function Semaforo({ tono, perfil }: { tono: 'sano' | 'atencion' | 'riesgo'; perfil: string }) {
  return (
    <div className="dash-semaforo" role="img" aria-label={`Salud financiera: ${perfil}`}>
      {LUCES.map((luz) => (
        <span key={luz} className={`dash-luz luz-${luz} ${luz === tono ? 'encendida' : ''}`} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KPIs                                                                */
/* ------------------------------------------------------------------ */

function Kpis({ workspace }: { workspace: PageProps['workspace'] }) {
  const { analisis } = workspace;
  const deuda = estadoEndeudamiento(analisis.nivelEndeudamiento);
  const hayIngreso = analisis.ingresoMensual > 0;

  return (
    <div className="dash-kpis">
      <Kpi icono={<Wallet size={20} />} titulo="Ingresos" valor={formatCurrency(analisis.ingresoMensual)} />
      <Kpi
        icono={<TrendDown size={20} />}
        titulo="Gastos"
        valor={formatCurrency(analisis.gastoTotalMes)}
        pie={hayIngreso ? `${formatPercent(analisis.ratioGastoIngreso)} de tus ingresos` : undefined}
      />
      <Kpi
        icono={<PiggyBank size={20} />}
        titulo="Ahorro"
        valor={formatCurrency(analisis.ahorroTotal)}
        pie={hayIngreso ? `${formatPercent(analisis.tasaAhorro)} de tus ingresos` : undefined}
      />
      <Kpi
        icono={<Scales size={20} />}
        titulo="Endeudamiento"
        valor={formatPercent(analisis.nivelEndeudamiento)}
        pie={deuda.texto}
        tono={deuda.tono}
      />
    </div>
  );
}

function Kpi({ icono, titulo, valor, pie, tono }: {
  icono: JSX.Element; titulo: string; valor: string; pie?: string; tono?: 'sano' | 'atencion' | 'riesgo';
}) {
  return (
    <article className="dash-kpi">
      <span className="dash-kpi-icono">{icono}</span>
      <small>{titulo}</small>
      <strong>{valor}</strong>
      {pie && <p className={tono ? `dash-kpi-pie tono-${tono}` : 'dash-kpi-pie'}>{pie}</p>}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Distribucion del gasto                                              */
/* ------------------------------------------------------------------ */

type Segmento = { clave: string; etiqueta: string; monto: number; color: string; porcentaje: number };

function DistribucionGasto({ resumen, total }: { resumen: Record<CategoriaFinanciera, number>; total: number }) {
  const segmentos = useMemo<Segmento[]>(() => {
    const ordenadas = (Object.entries(resumen) as [CategoriaFinanciera, number][])
      .filter(([, monto]) => monto > 0)
      .sort((a, b) => b[1] - a[1]);
    if (total <= 0) return [];

    const principales = ordenadas.slice(0, CATEGORIAS_VISIBLES).map(([clave, monto]) => ({
      clave, etiqueta: etiquetasCategoria[clave], monto, color: coloresCategoria[clave],
      porcentaje: (monto / total) * 100
    }));

    // El resto se agrupa solo si existe, y sumando: el total del centro sigue cuadrando.
    const resto = ordenadas.slice(CATEGORIAS_VISIBLES);
    if (resto.length === 0) return principales;
    const montoResto = resto.reduce((suma, [, monto]) => suma + monto, 0);
    return [...principales, {
      clave: 'resto',
      etiqueta: `Otras ${resto.length} categorias`,
      monto: montoResto,
      color: '#B7C0D6',
      porcentaje: (montoResto / total) * 100
    }];
  }, [resumen, total]);

  return (
    <article className="dash-card">
      <header className="dash-card-head">
        <h2>Asi se mueve tu dinero</h2>
      </header>
      {segmentos.length === 0
        ? <p className="dash-vacio-inline">Todavía no hay gastos clasificados en este mes.</p>
        : (
          <div className="dash-donut-layout">
            <Donut segmentos={segmentos} total={total} />
            <ul className="dash-leyenda">
              {segmentos.map((segmento) => (
                <li key={segmento.clave}>
                  <span className="dash-punto" style={{ background: segmento.color }} />
                  <span className="dash-leyenda-nombre">{segmento.etiqueta}</span>
                  <strong>{formatCurrency(segmento.monto)}</strong>
                  <small>{formatPercent(segmento.porcentaje)}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
    </article>
  );
}

/**
 * Donut construido con arcos SVG a partir de los segmentos reales.
 *
 * Reemplaza al conic-gradient que estaba fijo en CSS con porcentajes inventados
 * (38/64/84/96), que no tenian ninguna relacion con los datos mostrados al lado.
 */
function Donut({ segmentos, total }: { segmentos: Segmento[]; total: number }) {
  const radio = 68;
  const circunferencia = 2 * Math.PI * radio;
  let recorrido = 0;

  return (
    <div className="dash-donut">
      <svg viewBox="0 0 160 160" role="img" aria-label="Distribución del gasto por categoría">
        <g transform="rotate(-90 80 80)">
          {segmentos.map((segmento) => {
            const largo = (segmento.porcentaje / 100) * circunferencia;
            const desfase = -recorrido;
            recorrido += largo;
            return (
              <circle
                key={segmento.clave}
                cx="80" cy="80" r={radio}
                fill="none"
                stroke={segmento.color}
                strokeWidth="18"
                strokeDasharray={`${largo} ${circunferencia - largo}`}
                strokeDashoffset={desfase}
              />
            );
          })}
        </g>
      </svg>
      <div className="dash-donut-centro">
        <small>Total</small>
        <strong>{formatCurrency(total)}</strong>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Evolucion                                                           */
/* ------------------------------------------------------------------ */

type PuntoEvolucion = { mes: string; etiqueta: string; gasto: number };

function calcularEvolucion(transacciones: Transaccion[]): PuntoEvolucion[] {
  const porMes = new Map<string, number>();
  transacciones.filter((item) => item.tipo === 'gasto').forEach((item) => {
    const mes = item.fecha.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    porMes.set(mes, (porMes.get(mes) ?? 0) + Math.abs(item.monto));
  });
  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([mes, gasto]) => {
      const [anio, numero] = mes.split('-').map(Number);
      const etiqueta = new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(new Date(anio, numero - 1, 1));
      return { mes, etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1), gasto };
    });
}

function EvolucionGastos({ puntos }: { puntos: PuntoEvolucion[] }) {
  const [activo, setActivo] = useState<number | null>(null);

  if (puntos.length === 0) {
    return (
      <article className="dash-card">
        <header className="dash-card-head"><h2>Evolucion de gastos</h2></header>
        <p className="dash-vacio-inline">Todavía no hay gastos registrados.</p>
      </article>
    );
  }

  const ultimo = puntos[puntos.length - 1];
  const previo = puntos.length > 1 ? puntos[puntos.length - 2] : null;
  // Solo se compara si existe el mes anterior. Sin dato previo no hay variacion que mostrar.
  const variacion = previo && previo.gasto > 0
    ? ((ultimo.gasto - previo.gasto) / previo.gasto) * 100
    : null;

  const max = Math.max(...puntos.map((punto) => punto.gasto));
  const min = Math.min(...puntos.map((punto) => punto.gasto));
  const rango = max - min || max || 1;
  const posicion = (punto: PuntoEvolucion, indice: number) => ({
    x: puntos.length === 1 ? 50 : (indice / (puntos.length - 1)) * 100,
    y: 78 - ((punto.gasto - min) / rango) * 62
  });
  const linea = puntos.map((punto, indice) => {
    const { x, y } = posicion(punto, indice);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  const detalle = activo === null ? ultimo : puntos[activo];

  return (
    <article className="dash-card">
      <header className="dash-card-head">
        <h2>Evolucion de gastos</h2>
      </header>

      <div className="dash-evolucion-resumen">
        <strong>{detalle.etiqueta} · {formatCurrency(detalle.gasto)}</strong>
        {activo === null && variacion !== null && (
          <span className={variacion <= 0 ? 'tono-sano' : 'tono-atencion'}>
            {variacion <= 0 ? <ArrowDown size={14} weight="bold" /> : <ArrowUp size={14} weight="bold" />}
            {formatPercent(Math.abs(variacion))} {variacion <= 0 ? 'menos' : 'más'} que {previo?.etiqueta.toLowerCase()}
          </span>
        )}
      </div>

      <div className="dash-linea">
        <svg viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true">
          {[16, 47, 78].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} className="dash-linea-grid" vectorEffect="non-scaling-stroke" />
          ))}
          <polyline points={linea} className="dash-linea-trazo" vectorEffect="non-scaling-stroke" />
          {puntos.map((punto, indice) => {
            const { x, y } = posicion(punto, indice);
            return <circle key={punto.mes} cx={x} cy={y} r={activo === indice ? 2.6 : 1.6} className="dash-linea-punto" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <div className="dash-linea-zonas">
          {puntos.map((punto, indice) => (
            <button
              key={punto.mes}
              type="button"
              aria-label={`${punto.etiqueta}: ${formatCurrency(punto.gasto)}`}
              onMouseEnter={() => setActivo(indice)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(indice)}
              onBlur={() => setActivo(null)}
            />
          ))}
        </div>
      </div>

      <div className="dash-linea-etiquetas">
        {puntos.map((punto) => <small key={punto.mes}>{punto.etiqueta}</small>)}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Recomendacion destacada                                             */
/* ------------------------------------------------------------------ */

const ORDEN_PRIORIDAD = { Alta: 0, Media: 1, Baja: 2 } as const;

/** Eyebrow segun el perfil real: la derecha responde "que hago", no repite "como estoy". */
const EYEBROW_POR_TONO = {
  riesgo: 'Prioridad del mes',
  atencion: 'Qué podrías revisar',
  sano: 'Una oportunidad este mes'
} as const;

/**
 * Verbos con los que el motor de recomendaciones abre sus instrucciones.
 * Lista explicita y revisable: no hay generacion de copy ni heuristica difusa.
 */
const VERBOS_DE_ACCION = ['prioriza', 'aumenta', 'reduce', 'revisa', 'evita', 'destina', 'considera', 'ajusta', 'define', 'conviene'];

/**
 * Separa la instruccion del resto de la recomendacion.
 *
 * El backend devuelve un solo string, y el lado de la instruccion no es fijo:
 *   "Tu situacion actual requiere atencion: prioriza reducir gastos..."  -> instruccion detras
 *   "Aumenta tu frecuencia de ahorro: hoy te queda menos del 10%..."     -> instruccion delante
 *
 * Se titula siempre con la mitad que instruye. La otra mitad solo se muestra cuando es
 * la evidencia que sigue a la instruccion; si es un preambulo generico ("Alerta",
 * "Tu situacion actual requiere atencion") se descarta, porque no aporta y ademas
 * repetia lo que ya dice el diagnostico de la izquierda.
 */
function separarInstruccion(texto: string) {
  const corte = texto.indexOf(':');
  if (corte < 0) return { accion: comoOracion(texto), apoyo: null };

  const primera = texto.slice(0, corte).trim();
  const segunda = texto.slice(corte + 1).trim();
  const instruye = (frase: string) => VERBOS_DE_ACCION.some((verbo) => frase.toLowerCase().startsWith(verbo));

  if (instruye(primera)) return { accion: comoOracion(primera), apoyo: comoOracion(segunda) };
  return { accion: comoOracion(segunda), apoyo: null };
}

/**
 * Zona derecha del panel: que hacer.
 *
 * No inventa recomendaciones, impactos, plazos ni porcentajes: todo sale del texto real
 * que devuelve el motor. Lo unico que se decide aqui es como presentarlo.
 */
function Oportunidad({ workspace, navegar }: { workspace: PageProps['workspace']; navegar: PageProps['navegar'] }) {
  const { tono } = lecturaDelPerfil(workspace.analisis.perfilFinanciero);
  const principal = [...workspace.analisis.recomendaciones]
    .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad])[0];

  // El motor solo genera recomendaciones cuando algun indicador se sale de rango.
  if (!principal) {
    return (
      <section className="dash-oportunidad">
        <p className="dash-eyebrow">{tono === 'sano' ? 'Todo va en orden' : EYEBROW_POR_TONO[tono]}</p>
        <p className="dash-oportunidad-cuerpo">
          {tono === 'sano'
            ? 'No hay acciones prioritarias para este período.'
            : 'No hay una recomendación disponible para este período.'}
        </p>
        <button type="button" className="dash-enlace" onClick={() => navegar(tono === 'sano' ? 'analisis' : 'recomendaciones')}>
          {tono === 'sano' ? 'Ver análisis' : 'Ver recomendaciones'} <ArrowRight size={15} />
        </button>
      </section>
    );
  }

  const { accion, apoyo } = separarInstruccion(principal.descripcion);

  return (
    <section className="dash-oportunidad">
      <p className="dash-eyebrow">{EYEBROW_POR_TONO[tono]}</p>
      <h3>{accion}</h3>
      {apoyo && <p className="dash-oportunidad-cuerpo">{apoyo}</p>}
      <button type="button" className="dash-enlace" onClick={() => navegar('recomendaciones')}>
        Ver recomendaciones <ArrowRight size={15} />
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ultimos movimientos                                                 */
/* ------------------------------------------------------------------ */

function UltimosMovimientos({ transacciones, navegar }: { transacciones: Transaccion[]; navegar: PageProps['navegar'] }) {
  const ultimos = transacciones.slice(0, 5);

  return (
    <article className="dash-card">
      <header className="dash-card-head">
        <h2>Últimos movimientos</h2>
        <button type="button" className="dash-enlace" onClick={() => navegar('transacciones')}>
          Ver todas <ArrowRight size={15} />
        </button>
      </header>
      <ul className="dash-movimientos">
        {ultimos.map((item) => (
          <li key={item.id}>
            <span className="dash-movimiento-fecha">
              {new Date(`${item.fecha}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
            </span>
            <span className="dash-movimiento-detalle">
              <strong>{item.descripcion}</strong>
              {/* Ingresos y ahorros no tienen categoria: se nombra el tipo. */}
              <small>{item.categoria ? etiquetasCategoria[item.categoria] : ETIQUETAS_TIPO_MOVIMIENTO[item.tipo]}</small>
            </span>
            <span className={item.monto < 0 ? 'dash-movimiento-monto' : 'dash-movimiento-monto entrada'}>
              {formatCurrency(item.monto)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

function EsqueletoTablero() {
  return (
    <section className="page-stack dashboard" aria-busy="true">
      <PageHeader title="Resumen financiero" subtitle="Lo más importante de tus finanzas este mes." />
      <div className="dash-salud dash-salud-esqueleto" />
      <div className="dash-kpis">
        {[0, 1, 2, 3].map((indice) => <div key={indice} className="dash-kpi dash-esqueleto" />)}
      </div>
      <div className="dash-columnas">
        <div className="dash-card dash-esqueleto alto" />
        <div className="dash-card dash-esqueleto alto" />
      </div>
    </section>
  );
}

function SinTransacciones({ onImportar }: { onImportar: () => void }) {
  return (
    <section className="page-stack dashboard">
      <PageHeader title="Resumen financiero" subtitle="Lo más importante de tus finanzas este mes." />
      <article className="dash-estado">
        <span className="dash-estado-icono"><ChartLineUp size={30} /></span>
        <h2>Aun no podemos analizar tus finanzas</h2>
        <p>Agrega o importa transacciones para generar tu primer diagnóstico.</p>
        <button type="button" className="dash-boton" onClick={onImportar}>
          <FileArrowUp size={18} /> Importar CSV
        </button>
      </article>
    </section>
  );
}

function SinAnalisis() {
  return (
    <article className="dash-estado compacto">
      <span className="dash-estado-icono"><ChartLineUp size={26} /></span>
      <h2>Todavía no hay un diagnóstico</h2>
      <p>Estamos reuniendo la información de este mes. En cuanto haya datos suficientes verás tu perfil aquí.</p>
    </article>
  );
}

function ErrorAnalisis({ onReintentar }: { onReintentar: () => void }) {
  return (
    <article className="dash-error">
      <div>
        <strong>No pudimos actualizar tu análisis.</strong>
        <p>Tus transacciones siguen guardadas.</p>
      </div>
      <button type="button" className="dash-boton-suave" onClick={onReintentar}>Intentar nuevamente</button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Componentes compartidos con otras paginas                           */
/*                                                                     */
/* Los importan Transacciones, Analisis, Presupuesto, Recomendaciones, */
/* Historial, Archivos y Configuracion. Se mantienen aqui y con la     */
/* misma firma para no arrastrar un refactor de siete vistas.          */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: JSX.Element }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`app-card ${className}`}>
      <h2>{title}</h2>
      {children}
    </article>
  );
}

export function MetricCard({ icon, title, value, tone, delta }: { icon: JSX.Element; title: string; value: string; tone: string; delta?: string }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <small>{title}</small>
        <strong className={tone}>{value}</strong>
        {/* Solo se pinta si hay una comparacion real que mostrar. */}
        {delta && <p>{delta} vs. mes anterior</p>}
      </div>
    </article>
  );
}

export function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function ProfileBanner({ perfil, probabilidad }: { perfil: string; probabilidad: number }) {
  return (
    <div className="profile-banner">
      <strong>{perfil}</strong>
      <span>Probabilidad: {probabilidad.toFixed(2)}</span>
    </div>
  );
}

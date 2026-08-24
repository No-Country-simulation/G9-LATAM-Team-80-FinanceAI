import { ArrowClockwise, ArrowRight, CheckCircle, DownloadSimple, Info, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { gastosSinDeudas } from '../../../compartido/servicios/analisisFinanciero.service';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { CategoriaFinanciera, ResultadoAnalisis } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { PageHeader, nombreDelPeriodo } from '../../tablero/presentacion/DashboardPage';
import '../../../compartido/estilos/modal.css';
import './analisis.css';

type Tab = 'analisis' | 'metodologia';
const ENFOCABLES = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Cada entrada esta anclada a una de las cinco razones que emite calcular_perfil_reglas
 * (backend ML). No hay factores inventados: si el analisis devuelve una razon que no
 * encaja con ninguna, se muestra el texto original tal cual, solo con pulido tipografico.
 */
function interpretarRazon(razon: string): { categoria: 'endeudamiento' | 'gasto' | null; titulo: string; cuerpo: string | null } {
  if (/^el nivel de endeudamiento supera el \d+% del ingreso$/.test(razon)) {
    return {
      categoria: 'endeudamiento',
      titulo: 'Endeudamiento elevado',
      cuerpo: 'Una parte importante de tus ingresos está comprometida con deuda, lo que reduce tu margen financiero.'
    };
  }
  if (/^el endeudamiento esta en zona moderada \(\d+%-\d+%\)$/.test(razon)) {
    return {
      categoria: 'endeudamiento',
      titulo: 'Endeudamiento en zona moderada',
      cuerpo: 'Todavía tienes margen frente a tu deuda, pero conviene no aumentarlo.'
    };
  }
  if (/^los gastos representan mas del \d+% del ingreso mensual$/.test(razon)) {
    return {
      categoria: 'gasto',
      titulo: 'Gastos muy cercanos a tus ingresos',
      cuerpo: 'Casi todo lo que ingresas se va en gastos. Queda poco margen para imprevistos o para ahorrar.'
    };
  }
  if (/^los gastos representan entre el \d+% y \d+% del ingreso$/.test(razon)) {
    return {
      categoria: 'gasto',
      titulo: 'Gastos altos frente a tus ingresos',
      cuerpo: 'La mayor parte de lo que ingresas se va en gastos, así que el margen para imprevistos es reducido.'
    };
  }
  if (/^endeudamiento controlado y gasto razonable frente al ingreso$/.test(razon)) {
    return {
      categoria: null,
      titulo: 'Endeudamiento y gastos bajo control',
      cuerpo: 'Tu deuda y tus gastos están en un rango razonable frente a lo que ingresas.'
    };
  }
  const pulido = razon.replace(/(\d)%/g, '$1 %');
  return { categoria: null, titulo: pulido.charAt(0).toUpperCase() + pulido.slice(1), cuerpo: null };
}

/** Estado + tono visual del perfil. No inventa un perfil nuevo: solo nombra y colorea el que ya llego. */
function estadoDelPerfil(perfil: string): { etiqueta: string; tono: 'sano' | 'atencion' | 'riesgo' } {
  if (perfil.startsWith('En riesgo')) return { etiqueta: perfil.toLocaleUpperCase('es'), tono: 'riesgo' };
  if (perfil.startsWith('En observaci')) return { etiqueta: perfil.toLocaleUpperCase('es'), tono: 'atencion' };
  return { etiqueta: perfil.toLocaleUpperCase('es'), tono: 'sano' };
}

/** Que factor nombrar como "principal" en el diagnostico: el de la primera razon real. */
function fraseDiagnostico(razones: string[]) {
  const principal = razones[0] ? interpretarRazon(razones[0]) : null;
  if (!principal?.categoria) return 'Tu endeudamiento y tus gastos están dentro de un rango saludable frente a tu ingreso.';
  return principal.categoria === 'endeudamiento'
    ? 'El endeudamiento es el principal factor que está afectando tu salud financiera.'
    : 'El gasto frente a tu ingreso es el principal factor que está afectando tu salud financiera.';
}

/**
 * Que indicador ilustrar en el aro del diagnostico. Si la razon principal es de gasto, se
 * muestra ratioGastoIngreso; si es de endeudamiento (o no hay causa de riesgo, ej.
 * "Saludable"), se muestra nivelEndeudamiento -- el eje principal del modelo de perfil.
 */
function indicadorPrincipal(razones: string[], analisis: ResultadoAnalisis) {
  const principal = razones[0] ? interpretarRazon(razones[0]) : null;
  if (principal?.categoria === 'gasto') {
    return {
      valor: analisis.ratioGastoIngreso,
      etiqueta: 'Gasto sobre el ingreso',
      frase: `El ${formatPercent(analisis.ratioGastoIngreso)} de tus ingresos se destina a gastos, sin contar deuda.`
    };
  }
  return {
    valor: analisis.nivelEndeudamiento,
    etiqueta: 'Nivel de endeudamiento',
    frase: `El ${formatPercent(analisis.nivelEndeudamiento)} de tus ingresos está comprometido con deuda.`
  };
}

/**
 * El "43%" (o el rango "36%-43%") sale del texto real de la razon, nunca de un numero
 * fijo en el frontend: si la regla del backend cambiara de umbral, este texto cambia solo.
 */
function contextoUmbral(razon: string | undefined) {
  if (!razon) return null;
  const enRiesgo = razon.match(/^el nivel de endeudamiento supera el (\d+)% del ingreso$/);
  if (enRiesgo) return `Este nivel supera el ${enRiesgo[1]}% de referencia utilizado por el análisis.`;
  const moderado = razon.match(/^el endeudamiento esta en zona moderada \((\d+)%-(\d+)%\)$/);
  if (moderado) return `Este nivel está en la zona moderada de referencia del análisis (${moderado[1]}%–${moderado[2]}%).`;
  return null;
}

function contarTransacciones(cantidad: number) {
  return cantidad === 1 ? '1 transacción' : `${cantidad} transacciones`;
}

/**
 * Sintesis factual del patron: cuanto pesan juntas las dos categorias principales. No es
 * una recomendacion ("deberias reducir...") -- eso vive en la pantalla de Recomendaciones,
 * esta linea solo describe lo que ya paso. Con una sola categoria con gasto, se ajusta el
 * copy en singular en vez de inventar una segunda.
 */
function sintesisPatron(top: [CategoriaFinanciera, number][], total: number) {
  if (!top.length) return null;
  if (top.length === 1) {
    const [categoria, valor] = top[0];
    const participacion = total ? (valor / total) * 100 : 0;
    return `${etiquetasCategoria[categoria]} concentra el ${formatPercent(participacion)} de tus gastos sin deuda.`;
  }
  const [[categoriaA, valorA], [categoriaB, valorB]] = top;
  const participacion = total ? ((valorA + valorB) / total) * 100 : 0;
  return `${etiquetasCategoria[categoriaA]} y ${etiquetasCategoria[categoriaB]} concentran el ${formatPercent(participacion)} de tus gastos sin deuda.`;
}

/**
 * Botón único de la cabecera. Reemplaza a la vista/formulario independiente que existía
 * antes: "Actualizar análisis" ya no abre una página con campos genéricos, decide en el
 * momento si puede recalcular con lo que ya sabe o si le falta un dato.
 *
 * nivelEndeudamiento nunca es parte de esta decisión: se recalcula solo (ver
 * useFinancialWorkspace.calcularNivelEndeudamiento), nunca puede "faltar".
 */
function useActualizarAnalisis(workspace: PageProps['workspace']) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!actualizando || workspace.cargandoAnalisis) return;
    setActualizando(false);
    if (workspace.errorAnalisis) return;
    setConfirmado(true);
    const id = setTimeout(() => setConfirmado(false), 2600);
    return () => clearTimeout(id);
  }, [actualizando, workspace.cargandoAnalisis, workspace.errorAnalisis]);

  function alPulsar() {
    if (workspace.ingresoMensual === null) { setModalAbierto(true); return; }
    setActualizando(true);
    workspace.generarAnalisis();
  }

  function alConfirmarIngreso(ingreso: number) {
    setModalAbierto(false);
    setActualizando(true);
    workspace.generarAnalisis(ingreso);
  }

  return { modalAbierto, actualizando, confirmado, alPulsar, alConfirmarIngreso, cerrarModal: () => setModalAbierto(false) };
}

export function FinancialAnalysisPage({ workspace, navegar }: PageProps) {
  const [tabActiva, setTabActiva] = useState<Tab>('analisis');
  const { analisis } = workspace;
  // Misma definicion de gasto que usa el perfil: sin la categoria 'deudas'.
  const { resumen: resumenGastos, total } = gastosSinDeudas(analisis.resumenGastos);
  const rows = (Object.entries(resumenGastos) as [CategoriaFinanciera, number][])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  const periodo = nombreDelPeriodo(workspace.mesAnalizado);
  const hayTransacciones = workspace.transaccionesDelMes.length > 0;
  const { modalAbierto, actualizando, confirmado, alPulsar, alConfirmarIngreso, cerrarModal } = useActualizarAnalisis(workspace);

  // Sin transacciones no hay nada que recalcular: el boton no aparece (ver "no tocar"
  // salvo lo estrictamente necesario -- aqui evita ofrecer una accion que no puede hacer nada).
  const accionActualizar = hayTransacciones ? (
    <button className="an-boton primario" onClick={alPulsar} disabled={workspace.cargandoAnalisis}>
      <ArrowClockwise size={18} className={actualizando && workspace.cargandoAnalisis ? 'an-girando' : ''} />
      {actualizando && workspace.cargandoAnalisis ? 'Actualizando análisis…' : 'Actualizar análisis'}
      {confirmado && <span className="an-confirmacion"><CheckCircle size={15} weight="fill" /> Análisis actualizado</span>}
    </button>
  ) : undefined;

  const modal = modalAbierto && (
    <CompletarIngresoModal periodo={periodo ?? 'este período'} onConfirmar={alConfirmarIngreso} onCerrar={cerrarModal} />
  );

  /*
   * El periodo elegido no tiene con que analizarse. No se fabrica un perfil "Saludable"
   * con todo en cero: un periodo sin datos tiene que decirlo. Dos causas distintas, dos
   * mensajes distintos -- no hay transacciones (ir a Transacciones) o hay transacciones
   * pero ningun ingreso conocido (pulsar Actualizar analisis abre el dialogo que lo pide).
   */
  if (!workspace.analisisListo && !workspace.cargandoAnalisis) {
    return <section className="page-stack analisis">
      <PageHeader title="Análisis financiero" subtitle="Entiende qué está influyendo en tu situación financiera." action={accionActualizar} />
      {workspace.errorAnalisis && <p className="form-error">{workspace.errorAnalisis} Verifica que el backend y el servicio ML esten encendidos.</p>}
      <article className="an-estado">
        {hayTransacciones ? <>
          <h2>Aún no conocemos tu ingreso de {periodo ?? 'este período'}.</h2>
          <p>FinanceAI ya tiene {contarTransacciones(workspace.transaccionesDelMes.length)} de este período. Pulsa "Actualizar análisis" para indicar tu ingreso y completar el análisis.</p>
        </> : <>
          <h2>Aún no hay suficiente información para analizar {periodo ?? 'este período'}.</h2>
          <p>Registra o importa movimientos para que FinanceAI pueda interpretar este período.</p>
          <button type="button" className="an-boton primario" onClick={() => navegar('transacciones')}>Ir a Transacciones</button>
        </>}
      </article>
      {modal}
    </section>;
  }

  return <section className="page-stack analisis">
    <PageHeader title="Análisis financiero" subtitle="Entiende qué está influyendo en tu situación financiera." action={accionActualizar} />
    {workspace.cargandoAnalisis && <div className="an-info-strip"><p>Analizando tus movimientos...</p></div>}
    {workspace.errorAnalisis && <p className="form-error">{workspace.errorAnalisis} Verifica que el backend y el servicio ML esten encendidos.</p>}

    <div className="an-tabs">
      <button className={tabActiva === 'analisis' ? 'active' : ''} onClick={() => setTabActiva('analisis')}>Análisis</button>
      <button className={tabActiva === 'metodologia' ? 'active' : ''} onClick={() => setTabActiva('metodologia')}>Metodología</button>
    </div>

    {tabActiva === 'analisis' && <>
      <DiagnosticoPeriodo analisis={analisis} />
      <div className="an-row">
        <QueEstaInfluyendo razones={analisis.razonesPerfil} />
        <IndicadoresFinancieros analisis={analisis} />
      </div>
      <PatronesGasto rows={rows} total={total} />
      <div className="an-sobre">
        <div className="an-sobre-texto">
          <p className="an-sobre-titulo"><Info size={15} weight="fill" /> Sobre este análisis</p>
          <p className="an-sobre-cuerpo">Basado en {contarTransacciones(workspace.transaccionesDelMes.length)} de {periodo ?? 'este período'} y tus datos actuales.</p>
        </div>
        <div className="an-sobre-acciones">
          <button type="button" className="an-enlace" onClick={() => setTabActiva('metodologia')}>Ver metodología <ArrowRight size={14} /></button>
          <button type="button" className="an-enlace" onClick={() => window.print()}><DownloadSimple size={16} /> Imprimir o guardar PDF</button>
        </div>
      </div>
      <div className="an-cta">
        <div className="an-cta-texto">
          <strong>¿Quieres saber qué hacer con este resultado?</strong>
          <p>Consulta tus recomendaciones personalizadas para mejorar tu salud financiera.</p>
        </div>
        <button type="button" className="an-enlace primario" onClick={() => navegar('recomendaciones')}>
          Ver recomendaciones <ArrowRight size={16} />
        </button>
      </div>
    </>}

    {tabActiva === 'metodologia' && <Metodologia workspace={workspace} />}
    {modal}
  </section>;
}

function DiagnosticoPeriodo({ analisis }: { analisis: ResultadoAnalisis }) {
  const { etiqueta, tono } = estadoDelPerfil(analisis.perfilFinanciero);
  const razonPrincipal = analisis.razonesPerfil[0];
  const interpretada = razonPrincipal ? interpretarRazon(razonPrincipal) : null;
  const indicador = indicadorPrincipal(analisis.razonesPerfil, analisis);
  const umbral = interpretada?.categoria === 'endeudamiento' ? contextoUmbral(razonPrincipal) : null;

  return <article className={`an-card an-diagnostico tono-${tono}`}>
    <p className="an-eyebrow">Diagnóstico del período</p>
    <div className="an-diagnostico-cuerpo">
      <div className="an-diagnostico-texto">
        <span className="an-diagnostico-pill">{etiqueta}</span>
        <p className="an-diagnostico-frase">{fraseDiagnostico(analisis.razonesPerfil)}</p>
      </div>
      <div className="an-diagnostico-indicador">
        <GaugeCircular valor={indicador.valor} tono={tono} />
        <div className="an-diagnostico-indicador-texto">
          <strong>{indicador.etiqueta}</strong>
          <p>{indicador.frase}</p>
          {umbral && <small>{umbral}</small>}
        </div>
      </div>
    </div>
  </article>;
}

/**
 * Aro de progreso compacto: sirve para leer el porcentaje, no para parecer un
 * velocimetro. Sin aguja, sin relieve 3D. Misma mecanica SVG que el Donut del Dashboard
 * (arco por strokeDasharray, rotado -90 para arrancar arriba), adaptada a un solo valor.
 */
function GaugeCircular({ valor, tono }: { valor: number; tono: 'sano' | 'atencion' | 'riesgo' }) {
  const clamped = Math.max(0, Math.min(100, valor));
  const radio = 40;
  const circunferencia = 2 * Math.PI * radio;
  const recorrido = (clamped / 100) * circunferencia;

  return <div className={`an-gauge tono-${tono}`}>
    <svg viewBox="0 0 96 96" role="img" aria-label={`${indicadorAria(tono)}: ${formatPercent(clamped)}`}>
      <g transform="rotate(-90 48 48)">
        <circle className="an-gauge-pista" cx="48" cy="48" r={radio} />
        <circle className="an-gauge-valor" cx="48" cy="48" r={radio}
          strokeDasharray={`${recorrido} ${circunferencia - recorrido}`} />
      </g>
    </svg>
    <div className="an-gauge-centro"><strong>{formatPercent(clamped)}</strong></div>
  </div>;
}

function indicadorAria(tono: 'sano' | 'atencion' | 'riesgo') {
  return tono === 'riesgo' ? 'Indicador en riesgo' : tono === 'atencion' ? 'Indicador en observación' : 'Indicador saludable';
}

/** Responde "que hizo que FinanceAI me clasificara asi": tantas tarjetas como razones reales, ni una mas. */
function QueEstaInfluyendo({ razones }: { razones: string[] }) {
  return <article className="an-card an-influencias">
    <h2>¿Qué está influyendo?</h2>
    <div className="an-influencias-lista">
      {razones.map((razon) => {
        const { titulo, cuerpo } = interpretarRazon(razon);
        return <div key={razon}>
          <p className="an-influencia-titulo">{titulo}</p>
          {cuerpo && <p className="an-influencia-cuerpo">{cuerpo}</p>}
        </div>;
      })}
      {!razones.length && <p className="an-vacio">No hay factores especificos que reportar para este período.</p>}
    </div>
  </article>;
}

/**
 * Indicador + valor + explicacion, sin pills de "Alto/Bajo": esos estados no existen como
 * regla real y homogenea para las tres metricas (el ML solo define umbrales de riesgo
 * para endeudamiento y gasto/ingreso, no para tasa de ahorro), asi que no se inventan.
 */
function IndicadoresFinancieros({ analisis }: { analisis: ResultadoAnalisis }) {
  const indicadores = [
    { etiqueta: 'Tasa de ahorro', valor: formatPercent(analisis.tasaAhorro), descripcion: 'Parte de tu ingreso que estás logrando ahorrar en el período.' },
    { etiqueta: 'Nivel de endeudamiento', valor: formatPercent(analisis.nivelEndeudamiento), descripcion: 'Porcentaje de tus ingresos comprometido con el pago de deudas.' },
    { etiqueta: 'Gasto / ingreso', valor: formatPercent(analisis.ratioGastoIngreso), descripcion: 'Porcentaje de tus ingresos destinado a gastos, sin incluir pagos de deuda.' }
  ];
  if (analisis.gastosRecurrentes > 0) {
    indicadores.push({ etiqueta: 'Gastos de vivienda', valor: formatCurrency(analisis.gastosRecurrentes), descripcion: 'Monto destinado a vivienda durante el período.' });
  }

  return <article className="an-card an-indicadores">
    <h2>Indicadores financieros</h2>
    <dl>
      {indicadores.map((indicador) => <div key={indicador.etiqueta}>
        <dt><span>{indicador.etiqueta}</span><strong>{indicador.valor}</strong></dt>
        <dd>{indicador.descripcion}</dd>
      </div>)}
    </dl>
  </article>;
}

/** Ranking de a lo sumo tres categorias, no la distribucion completa (eso ya vive en el Dashboard). */
function PatronesGasto({ rows, total }: { rows: [CategoriaFinanciera, number][]; total: number }) {
  const top = rows.slice(0, 3);
  const ordinal = ['Mayor peso del período', 'Segundo mayor peso', 'Tercer mayor peso'];
  const maxValor = top[0]?.[1] ?? 0;

  return <article className="an-card an-patrones">
    <h2>Patrones de gasto</h2>
    <p className="an-patrones-subtitulo">Las categorías que más peso tienen en tus gastos sin deuda.</p>
    {!top.length && <p className="an-vacio">Aún no hay gastos registrados en este período.</p>}
    {top.length > 0 && <ol className="an-patrones-lista">
      {top.map(([categoria, valor], indice) => {
        const participacion = total ? (valor / total) * 100 : 0;
        return <li key={categoria}>
          <span className="an-patrones-rango">{indice + 1}</span>
          <div className="an-patrones-categoria">
            <strong>{etiquetasCategoria[categoria]}</strong>
            <small>{ordinal[indice]}</small>
          </div>
          <div className="an-patrones-cifras">
            <strong>{formatCurrency(valor)}</strong>
            <span className="an-patrones-porcentaje">{formatPercent(participacion)}</span>
          </div>
          <div className="an-patrones-barra"><span style={{ width: `${maxValor ? (valor / maxValor) * 100 : 0}%` }} /></div>
        </li>;
      })}
    </ol>}
    {top.length > 0 && <p className="an-patrones-sintesis">{sintesisPatron(top, total)}</p>}
  </article>;
}

/** "Cómo se obtuvo" de antes, renombrado: transparencia comprensible, sin internals del modelo. */
function Metodologia({ workspace }: { workspace: PageProps['workspace'] }) {
  const { analisis } = workspace;
  return <div className="an-row">
    <article className="an-card">
      <h2>Datos considerados</h2>
      <dl className="an-lista-datos">
        <div><dt>Transacciones procesadas</dt><dd>{workspace.transaccionesDelMes.length}</dd></div>
        <div><dt>Ingreso mensual</dt><dd>{formatCurrency(analisis.ingresoMensual)}</dd></div>
        <div><dt>Gastos analizados</dt><dd>{formatCurrency(analisis.gastoTotalMes)}</dd></div>
        <div><dt>Ahorro registrado</dt><dd>{formatCurrency(analisis.ahorroTotal)}</dd></div>
      </dl>
    </article>
    <article className="an-card">
      <h2>Cómo se interpreta</h2>
      <div className="an-metodologia-lista">
        <p>Cada gasto se clasifica automáticamente a partir de su descripción, y las correcciones que confirmas se conservan para los próximos análisis.</p>
        <p>Se comparan tus gastos, tu ingreso, tu ahorro y tu deuda para evaluar tu perfil financiero del período.</p>
        <p>Las razones que ves en la pestaña Análisis reflejan las reglas que determinaron tu perfil.</p>
      </div>
    </article>
  </div>;
}

/**
 * Dialogo contextual: pide UN dato, solo cuando de verdad falta.
 *
 * nivelEndeudamiento nunca aparece aqui -- no es un dato que pueda faltar, se recalcula
 * solo desde los gastos categoria 'deudas' del periodo (0% si no hay ninguno). El unico
 * dato que el sistema no puede inferir es el ingreso, cuando el periodo no tiene ninguna
 * transaccion de tipo 'ingreso'.
 *
 * Mismo patron que ModalPresupuesto.tsx (el modal ya aprobado de FinanceAI): portal a
 * document.body, `inert` en .layout mientras esta abierto, scroll del body bloqueado,
 * trampa de foco con Tab, Escape cierra, el foco vuelve a quien abrio el dialogo.
 */
function CompletarIngresoModal({ periodo, onConfirmar, onCerrar }: {
  periodo: string;
  onConfirmar: (ingreso: number) => void;
  onCerrar: () => void;
}) {
  const [ingreso, setIngreso] = useState('');
  const [error, setError] = useState('');
  const modal = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

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

  useEffect(() => { campo.current?.focus(); }, []);

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

  function enviar(event: React.FormEvent) {
    event.preventDefault();
    const valor = Number(ingreso);
    if (!Number.isFinite(valor) || valor <= 0) { setError('Ingresa un monto mayor que cero.'); return; }
    onConfirmar(valor);
  }

  return createPortal(
    <div className="fa-modal-velo an-dialogo">
      <div className="fa-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <header className="fa-modal-cabecera">
          <div>
            <h2 id={idTitulo}>Completar análisis</h2>
            <p className="fa-modal-sub">{periodo}</p>
          </div>
          <button type="button" className="fa-modal-cerrar" aria-label="Cerrar" onClick={onCerrar}><X size={18} /></button>
        </header>
        <form className="fa-modal-form" onSubmit={enviar} noValidate>
          <div className="fa-modal-cuerpo">
            <p className="an-modal-explicacion">Necesitamos tu ingreso de {periodo} para calcular tus indicadores financieros.</p>
            <label className={`fa-campo ${error ? 'invalido' : ''}`}>
              <span>Ingreso mensual</span>
              <input
                ref={campo} type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="$ 0"
                value={ingreso} onChange={(event) => { setIngreso(event.target.value); setError(''); }}
                aria-invalid={!!error}
              />
              {error && <span className="fa-campo-error"><WarningCircle size={14} /> {error}</span>}
            </label>
          </div>
          <div className="fa-modal-pie">
            <button type="submit" className="fa-modal-cta">Continuar análisis</button>
            <button type="button" className="fa-modal-cancelar" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

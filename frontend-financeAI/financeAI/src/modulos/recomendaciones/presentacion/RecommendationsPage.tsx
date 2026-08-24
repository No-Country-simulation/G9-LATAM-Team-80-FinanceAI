import { ArrowRight, CreditCard, Info, PiggyBank, Receipt, Target, TrendUp, X } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { formatPercent } from '../../../compartido/utilidades/formato';
import type { Recomendacion, ResultadoAnalisis } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { PageHeader, nombreDelPeriodo } from '../../tablero/presentacion/DashboardPage';
import '../../../compartido/estilos/modal.css';
import './recomendaciones.css';

const ENFOCABLES = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Umbral real de la regla `ahorro_bajo` en recomendaciones.py: se dispara cuando la tasa
 * de ahorro estimada cae por debajo de este porcentaje. Es el mismo numero que ya aparece
 * interpolado en el texto de una de las dos plantillas que usan esta regla ("...menos del
 * 10% de tu ingreso disponible"); se fija aca como constante porque la otra plantilla que
 * dispara la MISMA regla ("tu margen de ahorro real es bajo...") no lo trae en el texto.
 */
const UMBRAL_AHORRO_BAJO = 10;

/**
 * Nombres del ML que repiten la palabra "gastos" dentro de la frase (mismo ajuste que
 * Dashboard: sin esto sale "tu gasto en otros gastos").
 */
const NOMBRE_DE_CATEGORIA: Record<string, string> = {
  'otros gastos': 'la categoría Otros',
  'gastos profesionales': 'la categoría Profesionales'
};

/**
 * Reescrituras de acentos/tipografia sobre el copy que llega del motor de
 * recomendaciones. Duplicado local de las mismas plantillas de Dashboard
 * (DashboardPage.tsx, REESCRITURAS) -- ancladas a la frase completa, nunca un reemplazo
 * suelto: un texto que no calce exacto sale intacto. Se aplica SOLO al pintar; el string
 * original (`recomendacion.descripcion`) es el que ya vino clasificado por
 * convertirRecomendacion y no se toca aqui.
 */
const REESCRITURAS: { patron: RegExp; reemplazo: (...partes: string[]) => string }[] = [
  {
    patron: /^Alerta: tu gasto en (.+?) supera el (\d+)% de tu ingreso mensual, revisalo con prioridad\.$/,
    reemplazo: (_todo, nombre, porcentaje) =>
      `Alerta: tus gastos en ${NOMBRE_DE_CATEGORIA[nombre] ?? nombre} superan el ${porcentaje} % de tu ingreso mensual. Revísalos con prioridad.`
  },
  {
    patron: /^Estas destinando mas del (\d+)% de tu ingreso a (.+?), por encima de lo recomendado para esa categoria\.$/,
    reemplazo: (_todo, porcentaje, nombre) =>
      `Estás destinando más del ${porcentaje} % de tu ingreso a ${NOMBRE_DE_CATEGORIA[nombre] ?? nombre}, por encima de lo recomendado para esa categoría.`
  },
  {
    patron: /^Tu situacion actual requiere atencion: (.+)$/,
    reemplazo: (_todo, resto) => `Tu situación actual requiere atención: ${resto}`
  },
  {
    patron: /^Estas en una zona de alerta temprana: revisa tus categorias de mayor gasto (.+)$/,
    reemplazo: (_todo, resto) => `Estás en una zona de alerta temprana: revisa tus categorías de mayor gasto ${resto}`
  },
  {
    patron: /^Tu perfil es saludable, pero tu margen de ahorro real es bajo: conviene generar un colchon de emergencia\.$/,
    reemplazo: () => 'Tu perfil es saludable, pero tu margen de ahorro real es bajo: conviene generar un colchón de emergencia.'
  },
  {
    patron: /^Aumenta tu frecuencia de ahorro: hoy te queda menos del (\d+)% de tu ingreso disponible\.$/,
    reemplazo: (_todo, porcentaje) => `Aumenta tu frecuencia de ahorro: hoy te queda menos del ${porcentaje} % de tu ingreso disponible.`
  }
];

function pulirCopy(texto: string) {
  for (const { patron, reemplazo } of REESCRITURAS) {
    const partes = texto.match(patron);
    if (partes) return reemplazo(...partes);
  }
  return texto;
}

function comoOracion(texto: string) {
  const pulido = texto.replace(/(\d)%/g, '$1 %');
  return pulido.charAt(0).toUpperCase() + pulido.slice(1);
}

/** Divide el texto del motor en titulo (antes de ":") y cuerpo (despues). Si no hay ":", todo el texto es el titulo y no hay cuerpo -- asi nunca se repite la misma frase dos veces. */
function tituloYCuerpo(textoOriginal: string): { titulo: string; cuerpo: string | null } {
  const texto = pulirCopy(textoOriginal);
  const corte = texto.indexOf(':');
  if (corte < 0) return { titulo: comoOracion(texto), cuerpo: null };
  return { titulo: comoOracion(texto.slice(0, corte).trim()), cuerpo: comoOracion(texto.slice(corte + 1).trim()) };
}

/**
 * Titulos mas accionables para las DOS plantillas donde se dio una redaccion explicita.
 * Clave exacta = el string crudo del motor (el mismo que usa evidenciaDeRecomendacion),
 * nunca una coincidencia parcial ni una regla generica: un texto que no calce exacto (las
 * otras 4 plantillas, o cualquiera nueva que agregue el motor a futuro) sigue mostrando el
 * titulo derivado de tituloYCuerpo(), sin inventar una reescritura para algo que no se
 * audito. El string original (recomendacion.descripcion) nunca se toca -- esto es solo
 * lo que se pinta.
 */
const TITULOS_ACCIONABLES: Record<string, string> = {
  'Tu situacion actual requiere atencion: prioriza reducir gastos discrecionales y evita adquirir nueva deuda este mes.':
    'Reduce la presión de tus gastos y deuda'
  // "Aumenta tu frecuencia de ahorro: hoy te queda..." no necesita entrada aca: el titulo
  // por defecto (lo que ya devuelve tituloYCuerpo antes de los ":") ya es "Aumenta tu
  // frecuencia de ahorro", exactamente lo que se queria mostrar.
};

function tituloAccionable(textoOriginal: string, tituloPorDefecto: string): string {
  return TITULOS_ACCIONABLES[textoOriginal] ?? tituloPorDefecto;
}

/**
 * Evidencia cuantitativa detras de una recomendacion: el numero real (valor) y la
 * referencia real de la regla o del analisis que la origino -- nunca un umbral inventado.
 *
 * El motor tiene exactamente 6 plantillas posibles (auditado en recomendaciones.py). Dos
 * -- alerta_gasto_elevado y categoria_alta -- interpolan una categoria que el motor NO
 * devuelve estructurada (solo queda dentro del texto libre); esas dos siguen sin
 * evidencia (null) por la misma razon de siempre: extraerla del texto libre seria la
 * coincidencia fragil que se pidio evitar. Las otras cuatro son deterministas:
 *
 *   - perfil_general (2 variantes, via razonesPerfil): el `\d+` que la razon ya trae
 *     interpolado ES el umbral real que uso el analisis para clasificar el perfil -- se
 *     captura del texto, nunca se escribe a mano.
 *   - ahorro_bajo (2 variantes): la referencia es el umbral real de la regla (10%,
 *     UMBRAL_AHORRO_BAJO), confirmado en la auditoria funcional del motor. Se llama
 *     "Referencia de la regla", nunca "Meta sugerida": eso ultimo introduciria una
 *     interpretacion financiera que el motor no hace.
 */
type Evidencia = {
  etiqueta: string;
  valor: number;
  referencia: number;
  etiquetaReferencia: string;
  textoModal: string;
};

function evidenciaDeRecomendacion(textoOriginal: string, analisis: ResultadoAnalisis): Evidencia | null {
  if (
    textoOriginal === 'Tu situacion actual requiere atencion: prioriza reducir gastos discrecionales y evita adquirir nueva deuda este mes.' ||
    textoOriginal === 'Estas en una zona de alerta temprana: revisa tus categorias de mayor gasto antes de que se conviertan en un problema.'
  ) {
    return evidenciaDesdeRazonPerfil(analisis);
  }
  if (
    textoOriginal === 'Tu perfil es saludable, pero tu margen de ahorro real es bajo: conviene generar un colchon de emergencia.' ||
    textoOriginal === 'Aumenta tu frecuencia de ahorro: hoy te queda menos del 10% de tu ingreso disponible.'
  ) {
    return {
      etiqueta: 'Tasa actual',
      valor: analisis.tasaAhorro,
      referencia: UMBRAL_AHORRO_BAJO,
      etiquetaReferencia: 'Referencia de la regla',
      textoModal: `Tu tasa de ahorro actual es ${formatPercent(analisis.tasaAhorro)}.`
    };
  }
  return null;
}

/** Misma logica de interpretarRazon() en Analisis (duplicada, no importada: es un helper de presentacion local a cada pantalla). Las capturas (\d+) son el umbral real que el analisis ya escribio en la razon. */
function evidenciaDesdeRazonPerfil(analisis: ResultadoAnalisis): Evidencia | null {
  const razon = analisis.razonesPerfil[0];
  if (!razon) return null;

  const superaDeuda = razon.match(/^el nivel de endeudamiento supera el (\d+)% del ingreso$/);
  if (superaDeuda) {
    return {
      etiqueta: 'Nivel de endeudamiento',
      valor: analisis.nivelEndeudamiento,
      referencia: Number(superaDeuda[1]),
      etiquetaReferencia: 'Referencia del análisis',
      textoModal: `${formatPercent(analisis.nivelEndeudamiento)} de tus ingresos está comprometido con deuda.`
    };
  }
  const zonaModerada = razon.match(/^el endeudamiento esta en zona moderada \((\d+)%-(\d+)%\)$/);
  if (zonaModerada) {
    return {
      etiqueta: 'Nivel de endeudamiento',
      valor: analisis.nivelEndeudamiento,
      referencia: Number(zonaModerada[2]),
      etiquetaReferencia: 'Referencia del análisis',
      textoModal: `${formatPercent(analisis.nivelEndeudamiento)} de tus ingresos está comprometido con deuda.`
    };
  }
  const gastoAlto = razon.match(/^los gastos representan mas del (\d+)% del ingreso mensual$/);
  if (gastoAlto) {
    return {
      etiqueta: 'Gasto sobre el ingreso',
      valor: analisis.ratioGastoIngreso,
      referencia: Number(gastoAlto[1]),
      etiquetaReferencia: 'Referencia del análisis',
      textoModal: `${formatPercent(analisis.ratioGastoIngreso)} de tus ingresos se destina a gastos.`
    };
  }
  const gastoRango = razon.match(/^los gastos representan entre el (\d+)% y (\d+)% del ingreso$/);
  if (gastoRango) {
    return {
      etiqueta: 'Gasto sobre el ingreso',
      valor: analisis.ratioGastoIngreso,
      referencia: Number(gastoRango[2]),
      etiquetaReferencia: 'Referencia del análisis',
      textoModal: `${formatPercent(analisis.ratioGastoIngreso)} de tus ingresos se destina a gastos.`
    };
  }
  return null;
}

/**
 * Etiqueta e icono por tipo. `tipo` no viene del motor -- lo infiere
 * convertirRecomendacion() en el servicio, buscando palabras dentro del texto (ver
 * auditoria) -- asi que aqui se usa unicamente como adorno secundario (icono/eyebrow/
 * color de acento en las no-principales), nunca para decidir orden ni prioridad.
 */
const ETIQUETA_TIPO: Record<Recomendacion['tipo'], string> = {
  gastos: 'Gastos',
  ahorro: 'Ahorro',
  deudas: 'Deudas',
  ingresos: 'Ingresos'
};

const ICONO_TIPO: Record<Recomendacion['tipo'], Icon> = {
  gastos: Receipt,
  ahorro: PiggyBank,
  deudas: CreditCard,
  ingresos: TrendUp
};

const COLOR_TIPO: Record<Recomendacion['tipo'], string> = {
  gastos: '--fa-amber',
  ahorro: '--fa-green',
  deudas: '--fa-red',
  ingresos: '--fa-violet'
};

/** Tono del acento de "Prioridad del mes": el unico lugar donde el color de severidad sale del perfil real, no de texto. */
function tonoDelPerfil(perfil: string): 'sano' | 'atencion' | 'riesgo' {
  if (perfil.startsWith('En riesgo')) return 'riesgo';
  if (perfil.startsWith('En observaci')) return 'atencion';
  return 'sano';
}

const COLOR_TONO: Record<'sano' | 'atencion' | 'riesgo', string> = {
  sano: '--fa-green',
  atencion: '--fa-amber',
  riesgo: '--fa-red'
};

export function RecommendationsPage({ workspace, navegar }: PageProps) {
  const [activa, setActiva] = useState<Recomendacion | null>(null);
  const { analisis } = workspace;
  const periodo = nombreDelPeriodo(workspace.mesAnalizado);
  // Orden real del motor: ya viene ordenado por prioridad numerica antes de salir de
  // recomendaciones.py, y ese orden se preserva sin tocarse hasta aca. recomendaciones[0]
  // es siempre la mas urgente -- por eso NUNCA se reordena por un badge.
  const recomendaciones = analisis.recomendaciones;

  return <section className="page-stack recomendaciones">
    <PageHeader title="Recomendaciones" subtitle={`Acciones priorizadas a partir de tu situación financiera de ${periodo ?? 'este período'}.`} />

    {!workspace.analisisListo && (
      <EstadoVacio
        titulo={`Aún no podemos generar recomendaciones para ${periodo ?? 'este período'}.`}
        cuerpo="Completa el análisis del período para que FinanceAI pueda identificar oportunidades."
        navegar={navegar}
      />
    )}

    {workspace.analisisListo && recomendaciones.length === 0 && (
      <EstadoVacio
        titulo={`No detectamos acciones prioritarias para ${periodo ?? 'este período'}.`}
        cuerpo="FinanceAI no encontró oportunidades específicas con la información disponible de este período."
        navegar={navegar}
      />
    )}

    {workspace.analisisListo && recomendaciones.length > 0 && <>
      <ResumenPeriodo analisis={analisis} periodo={periodo ?? 'este período'} cantidad={recomendaciones.length} />

      {/*
        * recomendaciones[0] siempre entra como la "Prioridad del mes" (acento de severidad,
        * real del perfil); el resto entra con el acento de su propio tipo. Todas comparten
        * la misma composicion de card -- lo unico que cambia es el color y la etiqueta del
        * eyebrow. El grid se adapta solo: con 2 quedan lado a lado (la referencia aprobada),
        * con 1 la unica card ocupa la fila, con 3-4 se ajusta sin alterar el orden real.
        */}
      <div className="re-grid">
        {recomendaciones.map((item, indice) => (
          <RecomendacionCard
            key={item.id}
            recomendacion={item}
            analisis={analisis}
            principal={indice === 0}
            tono={tonoDelPerfil(analisis.perfilFinanciero)}
            onVerDetalle={() => setActiva(item)}
          />
        ))}
      </div>

      <ContextoRecomendaciones
        periodo={periodo ?? 'este período'}
        cantidadRecomendaciones={recomendaciones.length}
        cantidadTransacciones={workspace.transaccionesDelMes.length}
        navegar={navegar}
      />
    </>}

    {activa && <DetalleRecomendacionModal recomendacion={activa} analisis={analisis} onCerrar={() => setActiva(null)} />}
  </section>;
}

function EstadoVacio({ titulo, cuerpo, navegar }: { titulo: string; cuerpo: string; navegar: PageProps['navegar'] }) {
  return <article className="re-estado">
    <Target size={40} />
    <h2>{titulo}</h2>
    <p>{cuerpo}</p>
    <button type="button" className="re-boton primario" onClick={() => navegar('analisis')}>Ver análisis</button>
  </article>;
}

/**
 * Banda superior compacta: tres datos reales que ya existen en otra parte (cantidad real
 * de recomendaciones, perfil financiero real, periodo global elegido), en UNA superficie
 * con divisores -- no tres KPI cards independientes.
 */
function ResumenPeriodo({ analisis, periodo, cantidad }: { analisis: ResultadoAnalisis; periodo: string; cantidad: number }) {
  return <div className="re-resumen">
    <div className="re-resumen-item">
      <span className="re-resumen-etiqueta">Recomendaciones</span>
      <strong className="re-resumen-valor">{cantidad}</strong>
    </div>
    <div className="re-resumen-item">
      <span className="re-resumen-etiqueta">Perfil financiero</span>
      <strong className="re-resumen-valor">{analisis.perfilFinanciero}</strong>
    </div>
    <div className="re-resumen-item">
      <span className="re-resumen-etiqueta">Período analizado</span>
      <strong className="re-resumen-valor">{periodo}</strong>
    </div>
  </div>;
}

/**
 * Comparacion lineal en escala real 0-100 % (nivelEndeudamiento y tasaAhorro son, por
 * definicion, porcentajes del ingreso -- no hace falta "hacer zoom" a un rango mas chico):
 * relleno hasta el valor actual, una marca en la referencia real. Nunca donut, nunca
 * gauge, nunca una tendencia inventada.
 */
function BarraComparativa({ valor, referencia, colorVar }: { valor: number; referencia: number; colorVar: string }) {
  const pctValor = Math.min(100, Math.max(0, valor));
  const pctReferencia = Math.min(100, Math.max(0, referencia));
  const estilo = { '--barra-color': `var(${colorVar})` } as CSSProperties;

  return <div className="re-barra" role="img" aria-label={`${formatPercent(valor)} frente a una referencia de ${formatPercent(referencia)}`}>
    <div className="re-barra-pista" style={estilo}>
      <span className="re-barra-relleno" style={{ width: `${pctValor}%` }} />
      <span className="re-barra-marca" style={{ left: `${pctReferencia}%` }} />
    </div>
    <div className="re-barra-escala">
      <span>0 %</span>
      <span className="re-barra-escala-referencia" style={{ left: `${pctReferencia}%` }}>{formatPercent(referencia)}</span>
      <span>100 %</span>
    </div>
  </div>;
}

/**
 * Una recomendacion, principal o no: misma composicion de card (eyebrow, titulo, cuerpo,
 * divisor, la evidencia real con su microbarra, CTA). Lo unico que distingue a la
 * principal es el acento -- el color de severidad real (perfil) en vez del color de su
 * propio tipo -- y la etiqueta "Prioridad del mes" en vez de la categoria. El titulo
 * reescrito es solo presentacion (ver TITULOS_ACCIONABLES); el string crudo nunca se toca.
 */
function RecomendacionCard({ recomendacion, analisis, principal, tono, onVerDetalle }: {
  recomendacion: Recomendacion;
  analisis: ResultadoAnalisis;
  principal: boolean;
  tono: 'sano' | 'atencion' | 'riesgo';
  onVerDetalle: () => void;
}) {
  const { titulo, cuerpo } = tituloYCuerpo(recomendacion.descripcion);
  const evidencia = evidenciaDeRecomendacion(recomendacion.descripcion, analisis);
  const IconoTipo = ICONO_TIPO[recomendacion.tipo];
  const Icono = principal ? Target : IconoTipo;
  const etiquetaEyebrow = principal ? 'Prioridad del mes' : ETIQUETA_TIPO[recomendacion.tipo];
  const colorVar = principal ? COLOR_TONO[tono] : COLOR_TIPO[recomendacion.tipo];
  const claseAcento = principal ? `tono-${tono}` : `tipo-${recomendacion.tipo}`;
  const estilo = { '--acento': `var(${colorVar})` } as CSSProperties;

  return <article className={`re-card re-recomendacion ${claseAcento}`} style={estilo}>
    <p className="re-eyebrow"><span className={`re-icono ${claseAcento}`}><Icono size={18} weight="bold" /></span> {etiquetaEyebrow}</p>
    <h2>{tituloAccionable(recomendacion.descripcion, titulo)}</h2>
    {cuerpo && <p className="re-cuerpo">{cuerpo}</p>}

    {evidencia && <>
      <hr className="re-divisor" />
      <p className="re-stat-etiqueta">{evidencia.etiqueta}</p>
      <div className="re-stat-fila">
        <span className={`re-stat-valor ${claseAcento}`}>{formatPercent(evidencia.valor)}</span>
        <span className="re-stat-referencia-inline">{evidencia.etiquetaReferencia}: {formatPercent(evidencia.referencia)}</span>
      </div>
      <BarraComparativa valor={evidencia.valor} referencia={evidencia.referencia} colorVar={colorVar} />
    </>}

    <button type="button" className="re-enlace primario" onClick={onVerDetalle}>Ver recomendación <ArrowRight size={16} /></button>
  </article>;
}

/**
 * Cierre de pagina: una franja, nunca otra card protagonista. Fondo azul extremadamente
 * tenue, sin ilustracion. Copy a la izquierda, CTA a la derecha en la misma fila
 * (desktop); apilado en mobile. Un solo parrafo con los datos reales.
 */
function ContextoRecomendaciones({ periodo, cantidadRecomendaciones, cantidadTransacciones, navegar }: {
  periodo: string;
  cantidadRecomendaciones: number;
  cantidadTransacciones: number;
  navegar: PageProps['navegar'];
}) {
  return <div className="re-contexto">
    <div className="re-contexto-texto">
      <p className="re-contexto-titulo"><Info size={16} weight="bold" /> ¿Por qué recibes estas recomendaciones?</p>
      <p className="re-contexto-cuerpo">
        FinanceAI encontró {cantidadRecomendaciones} {cantidadRecomendaciones === 1 ? 'oportunidad' : 'oportunidades'} al
        analizar tu situación financiera y tus {cantidadTransacciones} {cantidadTransacciones === 1 ? 'movimiento' : 'movimientos'} de {periodo}.
      </p>
    </div>
    <button type="button" className="re-enlace" onClick={() => navegar('analisis')}>Ver análisis <ArrowRight size={14} /></button>
  </div>;
}

/**
 * Detalle de una recomendacion, en el modal ya aprobado de FinanceAI (mismo patron que
 * ModalPresupuesto.tsx y CompletarIngresoModal en Analisis: portal a document.body,
 * `inert` en .layout, scroll bloqueado, trampa de foco, Escape cierra).
 *
 * Antes esto navegaba a una vista aparte con plazo sugerido, checklist generico y
 * "marcar como plan de accion" -- nada de eso vino nunca del motor (la auditoria lo
 * confirmo), asi que no se traslada al rediseño. Solo se muestra lo que es real: el
 * cuerpo del texto del motor ("por que aparece") y el dato relacionado si existe.
 */
function DetalleRecomendacionModal({ recomendacion, analisis, onCerrar }: {
  recomendacion: Recomendacion;
  analisis: ResultadoAnalisis;
  onCerrar: () => void;
}) {
  const { titulo, cuerpo } = tituloYCuerpo(recomendacion.descripcion);
  const evidencia = evidenciaDeRecomendacion(recomendacion.descripcion, analisis);
  const modal = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => { cerrarRef.current?.focus(); }, []);

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

  return createPortal(
    <div className="fa-modal-velo re-dialogo">
      <div className="fa-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <header className="fa-modal-cabecera">
          <div><h2 id={idTitulo}>{tituloAccionable(recomendacion.descripcion, titulo)}</h2></div>
          <button ref={cerrarRef} type="button" className="fa-modal-cerrar" aria-label="Cerrar" onClick={onCerrar}><X size={18} /></button>
        </header>
        <div className="fa-modal-cuerpo">
          <div>
            <p className="re-eyebrow">Por qué aparece</p>
            <p className="re-detalle-texto">{cuerpo ?? comoOracion(pulirCopy(recomendacion.descripcion))}</p>
          </div>
          {evidencia && (
            <div>
              <p className="re-eyebrow">Dato relacionado</p>
              <p className="re-detalle-texto">{evidencia.textoModal}</p>
            </div>
          )}
        </div>
        <div className="fa-modal-pie">
          <button type="button" className="fa-modal-cta" onClick={onCerrar}>Entendido</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

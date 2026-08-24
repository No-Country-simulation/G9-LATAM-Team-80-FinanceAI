import { ArrowRight, CreditCard, PiggyBank, Receipt, Target, TrendUp, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatPercent } from '../../../compartido/utilidades/formato';
import type { Recomendacion, ResultadoAnalisis } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { PageHeader, nombreDelPeriodo } from '../../tablero/presentacion/DashboardPage';
import '../../../compartido/estilos/modal.css';
import './recomendaciones.css';

const ENFOCABLES = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

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
      `Alerta: tus gastos en ${NOMBRE_DE_CATEGORIA[nombre] ?? nombre} superan el ${porcentaje} % de tu ingreso mensual. Revísalos con prioridad.`
  },
  {
    patron: /^Estas destinando mas del (\d+)% de tu ingreso a (.+?), por encima de lo recomendado para esa categoria\.$/,
    reemplazo: (_todo, porcentaje, nombre) =>
      `Estás destinando más del ${porcentaje} % de tu ingreso a ${NOMBRE_DE_CATEGORIA[nombre] ?? nombre}, por encima de lo recomendado para esa categoría.`
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
    reemplazo: (_todo, porcentaje) => `Aumenta tu frecuencia de ahorro: hoy te queda menos del ${porcentaje} % de tu ingreso disponible.`
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
  const pulido = texto.replace(/(\d)%/g, '$1 %');
  return pulido.charAt(0).toUpperCase() + pulido.slice(1);
}

/**
 * Divide el texto del motor en titulo (antes de ":") y cuerpo (despues). Simple a
 * proposito: a diferencia de separarInstruccion() en Dashboard -- que descarta el
 * preambulo porque Dashboard ya muestra el diagnostico aparte --, aqui SI se muestran las
 * dos mitades, porque esta pantalla no tiene otro lugar donde ese contexto ya este dicho.
 */
function tituloYCuerpo(textoOriginal: string): { titulo: string; cuerpo: string | null } {
  const texto = pulirCopy(textoOriginal);
  const corte = texto.indexOf(':');
  if (corte < 0) return { titulo: comoOracion(texto), cuerpo: null };
  return { titulo: comoOracion(texto.slice(0, corte).trim()), cuerpo: comoOracion(texto.slice(corte + 1).trim()) };
}

/**
 * Dato relacionado: solo para los textos donde la asociacion es 100% determinista.
 *
 * El motor tiene exactamente 6 plantillas posibles (auditado en recomendaciones.py). Dos
 * de ellas -- alerta_gasto_elevado y categoria_alta -- interpolan una categoria que el
 * motor NO devuelve estructurada (solo queda dentro del texto libre); extraerla de ahi
 * seria la "coincidencia textual fragil" que se pidio evitar, asi que esas dos no
 * muestran dato relacionado. Las otras cuatro son strings FIJOS (sin interpolar nada
 * mas que ya se compara por igualdad exacta, no por keyword), y para esas la auditoria
 * aprobo reusar razonesPerfil (perfil_general) o tasaAhorro (ahorro_bajo).
 */
function datoRelacionado(textoOriginal: string, analisis: ResultadoAnalisis): string | null {
  if (
    textoOriginal === 'Tu situacion actual requiere atencion: prioriza reducir gastos discrecionales y evita adquirir nueva deuda este mes.' ||
    textoOriginal === 'Estas en una zona de alerta temprana: revisa tus categorias de mayor gasto antes de que se conviertan en un problema.'
  ) {
    return datoDesdeRazonPerfil(analisis);
  }
  if (
    textoOriginal === 'Tu perfil es saludable, pero tu margen de ahorro real es bajo: conviene generar un colchon de emergencia.' ||
    textoOriginal === 'Aumenta tu frecuencia de ahorro: hoy te queda menos del 10% de tu ingreso disponible.'
  ) {
    return `Tu tasa de ahorro actual es ${formatPercent(analisis.tasaAhorro)}.`;
  }
  return null;
}

/** Misma logica de interpretarRazon() en Analisis (duplicada, no importada: es un helper de presentacion local a cada pantalla). */
function datoDesdeRazonPerfil(analisis: ResultadoAnalisis): string | null {
  const razon = analisis.razonesPerfil[0];
  if (!razon) return null;
  if (
    /^el nivel de endeudamiento supera el \d+% del ingreso$/.test(razon) ||
    /^el endeudamiento esta en zona moderada \(\d+%-\d+%\)$/.test(razon)
  ) {
    return `${formatPercent(analisis.nivelEndeudamiento)} de tus ingresos está comprometido con deuda.`;
  }
  if (
    /^los gastos representan mas del \d+% del ingreso mensual$/.test(razon) ||
    /^los gastos representan entre el \d+% y \d+% del ingreso$/.test(razon)
  ) {
    return `${formatPercent(analisis.ratioGastoIngreso)} de tus ingresos se destina a gastos.`;
  }
  return null;
}

/**
 * Etiqueta e icono visual por tipo. `tipo` no viene del motor -- lo infiere
 * convertirRecomendacion() en el servicio, buscando palabras dentro del texto (ver
 * auditoria) -- asi que aqui se usa unicamente como adorno secundario, nunca para decidir
 * orden ni prioridad.
 */
const ETIQUETA_TIPO: Record<Recomendacion['tipo'], string> = {
  gastos: 'Gastos',
  ahorro: 'Ahorro',
  deudas: 'Deudas',
  ingresos: 'Ingresos'
};

const ICONO_TIPO: Record<Recomendacion['tipo'], JSX.Element> = {
  gastos: <Receipt size={13} weight="bold" />,
  ahorro: <PiggyBank size={13} weight="bold" />,
  deudas: <CreditCard size={13} weight="bold" />,
  ingresos: <TrendUp size={13} weight="bold" />
};

/** Tono del icono de "Prioridad del mes": el unico lugar donde vive el color de severidad, y sale del perfil real, no de texto. */
function tonoDelPerfil(perfil: string): 'sano' | 'atencion' | 'riesgo' {
  if (perfil.startsWith('En riesgo')) return 'riesgo';
  if (perfil.startsWith('En observaci')) return 'atencion';
  return 'sano';
}

export function RecommendationsPage({ workspace, navegar }: PageProps) {
  const [activa, setActiva] = useState<Recomendacion | null>(null);
  const { analisis } = workspace;
  const periodo = nombreDelPeriodo(workspace.mesAnalizado);
  // Orden real del motor: ya viene ordenado por prioridad numerica antes de salir de
  // recomendaciones.py, y ese orden se preserva sin tocarse hasta aca. recomendaciones[0]
  // es siempre la mas urgente -- por eso NUNCA se reordena por el badge Alta/Media/Baja.
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
        cuerpo="FinanceAI no encontró oportunidades específicas con la información actual de este período."
        navegar={navegar}
      />
    )}

    {workspace.analisisListo && recomendaciones.length > 0 && <>
      <PrioridadDelMes
        recomendacion={recomendaciones[0]}
        analisis={analisis}
        tono={tonoDelPerfil(analisis.perfilFinanciero)}
        onVerDetalle={() => setActiva(recomendaciones[0])}
      />

      {recomendaciones.length > 1 && (
        <div className="re-otras">
          <h2>Otras oportunidades</h2>
          <div className="re-otras-grid">
            {recomendaciones.slice(1, 4).map((item) => (
              <OportunidadCard key={item.id} recomendacion={item} analisis={analisis} onVerDetalle={() => setActiva(item)} />
            ))}
          </div>
        </div>
      )}

      <div className="re-contexto">
        <p className="re-contexto-titulo">¿Por qué estas recomendaciones?</p>
        <p className="re-contexto-cuerpo">FinanceAI las genera a partir de tu análisis financiero y tus movimientos de {periodo ?? 'este período'}.</p>
        <button type="button" className="re-enlace" onClick={() => navegar('analisis')}>Ver análisis <ArrowRight size={14} /></button>
      </div>
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

function PrioridadDelMes({ recomendacion, analisis, tono, onVerDetalle }: {
  recomendacion: Recomendacion;
  analisis: ResultadoAnalisis;
  tono: 'sano' | 'atencion' | 'riesgo';
  onVerDetalle: () => void;
}) {
  const { titulo, cuerpo } = tituloYCuerpo(recomendacion.descripcion);
  const dato = datoRelacionado(recomendacion.descripcion, analisis);

  return <article className="re-card re-principal">
    <p className="re-eyebrow"><span className={`re-icono tono-${tono}`}><Target size={13} weight="bold" /></span> Prioridad del mes</p>
    <h2>{titulo}</h2>
    {cuerpo && <p className="re-principal-cuerpo">{cuerpo}</p>}
    {dato && <p className="re-principal-dato">{dato}</p>}
    <button type="button" className="re-enlace primario" onClick={onVerDetalle}>Ver recomendación <ArrowRight size={16} /></button>
  </article>;
}

function OportunidadCard({ recomendacion, analisis, onVerDetalle }: {
  recomendacion: Recomendacion;
  analisis: ResultadoAnalisis;
  onVerDetalle: () => void;
}) {
  const { titulo, cuerpo } = tituloYCuerpo(recomendacion.descripcion);
  const dato = datoRelacionado(recomendacion.descripcion, analisis);

  return <article className="re-card re-oportunidad">
    <p className="re-eyebrow">{ICONO_TIPO[recomendacion.tipo]} {ETIQUETA_TIPO[recomendacion.tipo]}</p>
    <h3>{titulo}</h3>
    {cuerpo && <p className="re-oportunidad-cuerpo">{cuerpo}</p>}
    {dato && <p className="re-oportunidad-dato">{dato}</p>}
    <button type="button" className="re-enlace" onClick={onVerDetalle}>Ver recomendación <ArrowRight size={14} /></button>
  </article>;
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
  const dato = datoRelacionado(recomendacion.descripcion, analisis);
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
          <div><h2 id={idTitulo}>{titulo}</h2></div>
          <button ref={cerrarRef} type="button" className="fa-modal-cerrar" aria-label="Cerrar" onClick={onCerrar}><X size={18} /></button>
        </header>
        <div className="fa-modal-cuerpo">
          <div>
            <p className="re-eyebrow">Por qué aparece</p>
            <p className="re-detalle-texto">{cuerpo ?? comoOracion(pulirCopy(recomendacion.descripcion))}</p>
          </div>
          {dato && (
            <div>
              <p className="re-eyebrow">Dato relacionado</p>
              <p className="re-detalle-texto">{dato}</p>
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

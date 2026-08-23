import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CaretDown,
  CaretUp,
  ChartLineUp,
  Coins,
  Info,
  FileArrowUp,
  PiggyBank,
  TrendDown,
  Wallet
} from '@phosphor-icons/react';
import { useId, useMemo, useState } from 'react';
import { coloresCategoria, etiquetasCategoria } from '../../../compartido/constantes/categorias';
import {
  calcularDisponible,
  gastosSinDeudas,
  gastosVisibles,
  pagosDeDeuda,
  ratioGastoVisible
} from '../../../compartido/servicios/analisisFinanciero.service';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import './dashboard.css';

/** Cuantas categorias se listan antes de agrupar el resto. */
const CATEGORIAS_VISIBLES = 5;

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

/**
 * Nombres del ML que repiten la palabra "gastos" dentro de la frase.
 *
 * El servicio manda "otros gastos" y "gastos profesionales" como nombre legible, y la
 * plantilla los mete en "tu gasto en {nombre}": sale "tu gasto en otros gastos". Aqui se
 * nombran como categoria y la repeticion desaparece. Los otros diez nombres llegan bien
 * y pasan sin tocar, asi que nada queda fijado en el codigo salvo estas dos excepciones.
 */
const NOMBRE_DE_CATEGORIA: Record<string, string> = {
  'otros gastos': 'la categoría Otros',
  'gastos profesionales': 'la categoría Profesionales'
};

/**
 * Reescrituras del copy que llega del servicio de recomendaciones.
 *
 * Son plantillas ancladas, no reemplazos sueltos: cada expresion describe una frase
 * completa del generador y solo actua si encaja entera. Un texto que no coincida sale
 * intacto -- pasar un corrector de tildes por encima de una respuesta dinamica es la
 * forma segura de estropear una palabra que si estaba bien escrita.
 *
 * Se aplica SOLO al pintar. La cadena original es la que clasifica la prioridad y el
 * tipo en convertirRecomendacion (mira si empieza por "alerta", si contiene "deuda"...),
 * asi que tocarla antes cambiaria que recomendacion se considera la principal.
 */
const REESCRITURAS: { patron: RegExp; reemplazo: (...partes: string[]) => string }[] = [
  {
    patron: /^Alerta: tu gasto en (.+?) supera el (\d+)% de tu ingreso mensual, revisalo con prioridad\.$/,
    reemplazo: (_todo, nombre, porcentaje) =>
      `Alerta: tus gastos en ${NOMBRE_DE_CATEGORIA[nombre] ?? nombre} superan el ${porcentaje}\u00A0% de tu ingreso mensual. Revísalos con prioridad.`
  },
  {
    patron: /^Estas destinando mas del (\d+)% de tu ingreso a (.+?), por encima de lo recomendado para esa categoria\.$/,
    reemplazo: (_todo, porcentaje, nombre) =>
      `Estás destinando más del ${porcentaje}\u00A0% de tu ingreso a ${NOMBRE_DE_CATEGORIA[nombre] ?? nombre}, por encima de lo recomendado para esa categoría.`
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
    patron: /^el endeudamiento esta en zona moderada \((\d+)%-(\d+)%\)$/,
    reemplazo: (_todo, desde, hasta) => `el endeudamiento está en zona moderada (${desde}\u00A0%-${hasta}\u00A0%)`
  },
  {
    patron: /^los gastos representan mas del (\d+)% del ingreso mensual$/,
    reemplazo: (_todo, porcentaje) => `los gastos representan más del ${porcentaje}\u00A0% del ingreso mensual`
  },
  {
    patron: /^Aumenta tu frecuencia de ahorro: hoy te queda menos del (\d+)% de tu ingreso disponible\.$/,
    reemplazo: (_todo, porcentaje) =>
      `Aumenta tu frecuencia de ahorro: hoy te queda menos del ${porcentaje}\u00A0% de tu ingreso disponible.`
  }
];

/** Aplica la reescritura que corresponda, o devuelve el texto sin tocar. */
function pulirCopy(texto: string) {
  for (const { patron, reemplazo } of REESCRITURAS) {
    const partes = texto.match(patron);
    if (partes) return reemplazo(...partes);
  }
  return texto;
}

/**
 * En español el simbolo de porcentaje va separado del numero. Se usa un espacio duro
 * para que "43 %" no se parta al final de un renglon.
 *
 * Solo sobre prosa: las cifras de las tarjetas las escribe formatPercent y no pasan por
 * aqui, y ninguna comparacion del proyecto se hace contra este texto ya pintado.
 */
function espacioAntesDelPorcentaje(texto: string) {
  return texto.replace(/(\d)%/g, '$1\u00A0%');
}

/** Las razones llegan en minuscula desde el backend; aca solo se presentan. */
function comoOracion(texto: string) {
  const pulido = espacioAntesDelPorcentaje(texto);
  return pulido.charAt(0).toUpperCase() + pulido.slice(1);
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
        <PorQueEsteResultado analisis={analisis} razones={razones} />
      )}
    </article>
  );
}

/*
 * Cada razon del servicio, contada en dos tiempos: que pasa y que significa.
 *
 * El servicio devuelve una frase tecnica que nombra el umbral contra el que salto la
 * regla -- "el nivel de endeudamiento supera el 43% del ingreso" --, util para depurar
 * pero no para decidir nada. Aqui se traduce a un titulo corto y una explicacion de lo
 * que implica.
 *
 * Cada entrada esta anclada a una de las cinco razones que emite calcular_perfil_reglas.
 * No hay factores inventados: si el analisis devuelve una razon, aparece una; si no
 * devuelve ninguna que encaje, la frase original se muestra tal cual.
 *
 * Solo la cifra de endeudamiento entra en el texto, porque no esta en ninguna tarjeta.
 * Las razones de gasto se cuentan sin porcentaje: el suyo mide el gasto SIN deuda y
 * chocaria con el que muestra Egresos, que si la incluye.
 */
function explicarRazon(razon: string, analisis: PageProps['workspace']['analisis']) {
  const endeudamiento = formatPercent(analisis.nivelEndeudamiento);

  if (/^el nivel de endeudamiento supera el \d+% del ingreso$/.test(razon)) {
    return {
      titulo: 'Endeudamiento elevado',
      cuerpo: `El ${endeudamiento} de tus ingresos está comprometido con deuda. Esto reduce tu margen financiero para cubrir otros gastos y ahorrar.`
    };
  }
  if (/^el endeudamiento esta en zona moderada \(\d+%-\d+%\)$/.test(razon)) {
    return {
      titulo: 'Endeudamiento en zona moderada',
      cuerpo: `El ${endeudamiento} de tus ingresos está comprometido con deuda. Todavía tienes margen, pero conviene no aumentarlo.`
    };
  }
  if (/^los gastos representan mas del \d+% del ingreso mensual$/.test(razon)) {
    return {
      titulo: 'Gastos muy cercanos a tus ingresos',
      cuerpo: 'Casi todo lo que ingresas se va en gastos. Queda poco margen para imprevistos o para ahorrar.'
    };
  }
  if (/^los gastos representan entre el \d+% y \d+% del ingreso$/.test(razon)) {
    return {
      titulo: 'Gastos altos frente a tus ingresos',
      cuerpo: 'La mayor parte de lo que ingresas se va en gastos, así que el margen para imprevistos es reducido.'
    };
  }
  if (/^endeudamiento controlado y gasto razonable frente al ingreso$/.test(razon)) {
    return {
      titulo: 'Endeudamiento y gastos bajo control',
      cuerpo: 'Tu deuda y tus gastos están en un rango razonable frente a lo que ingresas.'
    };
  }
  // Una razon que no encaje se muestra como venga, solo con el pulido tipografico.
  return { titulo: comoOracion(pulirCopy(razon)), cuerpo: null };
}

/** Titulo del acordeon segun el veredicto. Ninguna variante inventa un perfil nuevo. */
const PREGUNTA_POR_TONO = {
  riesgo: '¿Por qué estás en riesgo?',
  atencion: '¿Por qué estás en observación?',
  sano: '¿Por qué tu perfil es saludable?'
} as const;

/*
 * Por que el modelo clasifico asi, y nada mas.
 *
 * Antes aqui vivian cuatro cifras -- endeudamiento, deuda pagada, gasto y ahorro -- que
 * ya estaban en las tarjetas de arriba. Repetirlas no respondia "por que estoy asi",
 * que es lo unico que se viene a buscar al abrir esto.
 *
 * Las razones salen de analisis.razonesPerfil, que es lo que el servicio devuelve como
 * justificacion del veredicto. Son como mucho dos: el generador para en cuanto encuentra
 * las que aplican, asi que no hay nada que recortar ni que rellenar.
 */
function PorQueEsteResultado({ analisis, razones }: {
  analisis: PageProps['workspace']['analisis'];
  razones: string[];
}) {
  const { tono } = lecturaDelPerfil(analisis.perfilFinanciero);

  return (
    <div className="dash-salud-detalle" id={ID_DETALLE_SALUD}>
      <h3>{PREGUNTA_POR_TONO[tono]}</h3>
      <ul>
        {razones.map((razon) => {
          const { titulo, cuerpo } = explicarRazon(razon, analisis);
          return (
            <li key={razon}>
              <span className={`dash-punto-razon tono-${tono}`} aria-hidden="true" />
              <div>
                <p className="dash-razon-titulo">{titulo}</p>
                {cuerpo && <p className="dash-razon-cuerpo">{cuerpo}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
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
        {razones[0] && <p className="dash-salud-razon">{comoOracion(pulirCopy(razones[0]))}</p>}

        {razones.length > 0 && (
          <button
            type="button"
            className={`dash-salud-toggle ${detalleVisible ? 'abierto' : ''}`}
            aria-expanded={detalleVisible}
            aria-controls={ID_DETALLE_SALUD}
            onClick={alternarDetalle}
          >
            {detalleVisible ? 'Ocultar explicación' : 'Ver por qué este resultado'}
            {detalleVisible ? <CaretUp size={14} /> : <CaretDown size={14} />}
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
  const hayIngreso = analisis.ingresoMensual > 0;
  /*
   * El endeudamiento dejo de ser tarjeta: la fila responde que entro, que salio, que se
   * ahorro y que queda. El porque del diagnostico vive en el detalle del semaforo.
   */
  const disponible = calcularDisponible(analisis);
  const enNegativo = disponible < 0;
  /*
   * La tarjeta muestra todo lo que salio, deuda incluida. Con gastoTotalMes a secas la
   * fila no cuadraba -- Ingresos menos Gastos menos Ahorro no daba Disponible -- porque
   * faltaba un sumando que no estaba en ninguna tarjeta.
   */
  const deuda = pagosDeDeuda(analisis);
  const egresos = gastosVisibles(analisis);
  const [verComposicion, setVerComposicion] = useState(false);

  return (
    <div className="dash-kpis">
      <Kpi
        color="ingresos"
        icono={<Wallet size={20} />}
        titulo="Ingresos"
        valor={formatCurrency(analisis.ingresoMensual)}
        pie="Total recibido este mes"
      />
      <Kpi
        color="gastos"
        icono={<TrendDown size={20} />}
        titulo="Egresos"
        ayuda="Los egresos incluyen los gastos del período y los pagos de deuda realizados."
        valor={formatCurrency(egresos)}
        pie={hayIngreso ? `${formatPercent(ratioGastoVisible(analisis))} de tus ingresos` : undefined}
        composicion={{
          activa: verComposicion,
          alternar: () => setVerComposicion((activa) => !activa),
          /*
           * Las dos partes que suman el total. "Pagos de deuda" es lo que se pago este
           * periodo -- resumenGastos.deudas --, no el saldo pendiente: por eso no se
           * llama "Deudas" a secas ni sale de nivelEndeudamiento.
           */
          filas: [
            { etiqueta: 'Gastos', valor: formatCurrency(analisis.gastoTotalMes) },
            { etiqueta: 'Pagos de deuda', valor: formatCurrency(deuda) }
          ]
        }}
      />
      <Kpi
        color="ahorro"
        icono={<PiggyBank size={20} />}
        titulo="Ahorro"
        valor={formatCurrency(analisis.ahorroTotal)}
        pie={hayIngreso ? `${formatPercent(analisis.tasaAhorro)} de tus ingresos` : undefined}
      />
      <Kpi
        color="disponible"
        icono={<Coins size={20} />}
        titulo="Disponible"
        ayuda="Disponible después de gastos, pagos de deuda y ahorro del período."
        valor={formatCurrency(disponible)}
        /* En positivo no se tiñe de verde: queda en el color normal de una cifra. */
        tonoValor={enNegativo ? 'riesgo' : undefined}
        pie={enNegativo ? 'Saldo negativo este mes' : 'Lo que te queda este mes'}
        tono={enNegativo ? 'riesgo' : undefined}
      />
    </div>
  );
}

type Composicion = {
  activa: boolean;
  alternar: () => void;
  filas: { etiqueta: string; valor: string }[];
};

function Kpi({ icono, titulo, valor, pie, tono, tonoValor, ayuda, color, composicion }: {
  icono: JSX.Element; titulo: string; valor: string; pie?: string;
  tono?: 'sano' | 'atencion' | 'riesgo'; tonoValor?: 'sano' | 'atencion' | 'riesgo';
  ayuda?: string;
  /* Un tinte por concepto: lo que entra, lo que sale, lo guardado y lo que queda. */
  color: 'ingresos' | 'gastos' | 'ahorro' | 'disponible';
  /* Solo Egresos: la otra vista de la misma tarjeta, no una seccion que se despliega. */
  composicion?: Composicion;
}) {
  const idVistas = useId();

  return (
    <article className="dash-kpi">
      <span className={`dash-kpi-icono ${color}`}>{icono}</span>
      <small>
        {titulo}
        {ayuda && (
          /* Enfocable a proposito: en un puntero se lee al pasar por encima, y con
             teclado o lector de pantalla se llega por tabulacion. */
          <span className="dash-kpi-ayuda" title={ayuda} role="note" aria-label={ayuda} tabIndex={0}>
            <Info size={13} />
          </span>
        )}
      </small>
      {!composicion ? (
        <>
          <strong className={tonoValor ? `tono-${tonoValor}` : undefined}>{valor}</strong>
          {pie && <p className={tono ? `dash-kpi-pie tono-${tono}` : 'dash-kpi-pie'}>{pie}</p>}
        </>
      ) : (
        <>
          {/*
            * Las dos vistas ocupan la MISMA celda del grid, apiladas. La inactiva no se
            * desmonta ni se oculta con display:none: sigue midiendo, asi que la celda
            * mide siempre lo que la mas alta y la tarjeta no cambia de altura al
            * alternar. visibility:hidden ademas la saca del foco y de los lectores.
            */}
          <div className="dash-kpi-vistas" id={idVistas}>
            <div className="dash-kpi-vista" aria-hidden={composicion.activa}>
              <strong className={tonoValor ? `tono-${tonoValor}` : undefined}>{valor}</strong>
              {pie && <p className={tono ? `dash-kpi-pie tono-${tono}` : 'dash-kpi-pie'}>{pie}</p>}
            </div>

            {/*
              * Sin encabezado propio: "Egresos" ya esta arriba y las dos etiquetas dicen
              * que es cada cifra. Un titulo mas hacia la vista mas alta de las dos y
              * engordaba las cuatro tarjetas de la fila.
              */}
            <dl className="dash-kpi-vista dash-kpi-composicion" aria-hidden={!composicion.activa}>
              {composicion.filas.map((fila) => (
                <div key={fila.etiqueta}>
                  <dt title={fila.etiqueta}>{fila.etiqueta}</dt>
                  <dd>{fila.valor}</dd>
                </div>
              ))}
            </dl>
          </div>

          <button
            type="button"
            className="dash-kpi-desplegar"
            aria-pressed={composicion.activa}
            aria-controls={idVistas}
            onClick={composicion.alternar}
          >
            {composicion.activa ? 'Ver total' : 'Ver composición'}
            {composicion.activa ? <CaretUp size={13} /> : <CaretDown size={13} />}
          </button>
        </>
      )}
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
      etiqueta: `Otras ${resto.length} categorías`,
      monto: montoResto,
      color: '#B7C0D6',
      porcentaje: (montoResto / total) * 100
    }];
  }, [resumen, total]);

  return (
    <article className="dash-card">
      <header className="dash-card-head">
        <div>
          <h2>Así se mueve tu dinero</h2>
          {/* El grafico se alimenta de gastosSinDeudas: la categoria queda fuera a
              proposito y callarlo haria pensar que el total es todo el gasto. */}
          <p className="dash-card-nota">Sin incluir pagos de deuda</p>
        </div>
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
        <header className="dash-card-head"><h2>Evolución de gastos</h2></header>
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
        <h2>Evolución de gastos</h2>
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

  const { accion, apoyo } = separarInstruccion(pulirCopy(principal.descripcion));

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

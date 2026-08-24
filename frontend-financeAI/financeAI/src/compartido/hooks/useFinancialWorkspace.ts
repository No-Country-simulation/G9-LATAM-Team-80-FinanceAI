import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analisisInicial, solicitarAnalisisFinanciero } from '../servicios/analisisFinanciero.service';
import {
  actualizarTransaccion as actualizarTransaccionApi,
  clasificarDescripcion as clasificarDescripcionApi,
  clasificarDescripciones as clasificarDescripcionesApi,
  crearTransaccion,
  eliminarAnalisis as eliminarAnalisisApi,
  eliminarPresupuesto as eliminarPresupuestoApi,
  eliminarTransaccion as eliminarTransaccionApi,
  guardarPresupuestos,
  importarTransacciones as importarTransaccionesApi,
  listarHistorial,
  listarPresupuestos,
  listarTransacciones
} from '../servicios/persistencia.service';
import type { CategoriaFinanciera, HistorialAnalisis, TipoTransaccion, Transaccion } from '../tipos/finanzas';

/*
 * Cuanto se puede navegar hacia atras y hacia delante desde el anio del sistema.
 *
 * Cinco atras cubre el historial que alguien puede querer repasar; uno adelante permite
 * planificar el presupuesto del anio que viene, que es el caso real que abrio esto. El
 * rango no mira los datos: si mirara, un usuario sin transacciones no podria navegar a
 * ningun sitio, que es justo el problema que se esta arreglando.
 */
const ANIOS_ATRAS = 5;
const ANIOS_ADELANTE = 1;

/** El mes de calendario de hoy, en YYYY-MM. Donde abre la aplicacion. */
function periodoDelSistema() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function movimientosDelMes(movimientos: Transaccion[], mes: string | null): Transaccion[] {
  if (mes === null) return movimientos;
  return movimientos.filter((item) => item.fecha.startsWith(mes));
}

/**
 * Nivel de endeudamiento: pagos de categoria 'deudas' del periodo, sobre el ingreso.
 *
 * Nunca es un dato que pueda "faltar": sin ninguna transaccion de esa categoria da 0%,
 * que es una lectura real (sin deuda), no una ausencia de dato. Por eso no se le pide
 * nunca a la persona -- a diferencia del ingreso, que si puede ser desconocido.
 */
function calcularNivelEndeudamiento(movimientos: Transaccion[], ingresoMensual: number): number {
  const deuda = movimientos
    .filter((item) => item.tipo === 'gasto' && item.categoria === 'deudas')
    .reduce((suma, item) => suma + Math.abs(item.monto), 0);
  // El backend valida 0..100; un mes con mas deuda que ingreso no debe romper el analisis.
  return Math.min(100, Math.round((deuda / ingresoMensual) * 1000) / 10);
}

/**
 * Deriva el ingreso mensual y el nivel de endeudamiento de los movimientos de UN periodo.
 *
 * Si el periodo no tiene movimientos de tipo 'ingreso' no hay de donde deducir ninguno de
 * los dos y se devuelve null: "sin dato", no un valor heredado de otro periodo ni un
 * default inventado (4500/25 no significaban nada real y escondian el problema en vez de
 * mostrarlo). Quien llama decide que hacer con el null -- pedirlo a la persona, en la
 * pantalla de Analisis.
 */
function deducirSupuestos(movimientos: Transaccion[]) {
  const ingreso = movimientos
    .filter((item) => item.tipo === 'ingreso')
    .reduce((suma, item) => suma + Math.abs(item.monto), 0);

  if (ingreso <= 0) return null;

  return { ingresoMensual: ingreso, nivelEndeudamiento: calcularNivelEndeudamiento(movimientos, ingreso) };
}

export function useFinancialWorkspace(token: string | null) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [presupuestos, setPresupuestos] = useState<Awaited<ReturnType<typeof listarPresupuestos>>>([]);
  const [historial, setHistorial] = useState<HistorialAnalisis[]>([]);
  const [analisis, setAnalisis] = useState(analisisInicial);
  // null = "sin dato": ni un default inventado ni el valor del periodo anterior.
  const [ingresoMensual, setIngresoMensual] = useState<number | null>(null);
  const [nivelEndeudamiento, setNivelEndeudamiento] = useState<number | null>(null);
  // Ya no se pide en ninguna pantalla: el ML nunca la usa (ver auditoria en Analisis).
  // Se mantiene en 'Media' fija solo porque el request al backend la sigue exigiendo.
  const [frecuenciaAhorro] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState('');
  const [revision, setRevision] = useState(0);
  const [revisionPresupuestos, setRevisionPresupuestos] = useState(0);
  const [hidratado, setHidratado] = useState(false);
  // Distingue "todavia no hay analisis" de "el analisis dio cero". Sin este flag, el
  // estado inicial (perfil Saludable y todo en cero) es indistinguible de un resultado
  // real, y el tablero mostraria un diagnostico que nadie calculo.
  const [analisisListo, setAnalisisListo] = useState(false);

  /*
   * El periodo es NAVEGACION, no un resultado de los datos.
   *
   * Antes se derivaba de las transacciones: solo se podian elegir meses con movimientos,
   * y elegir cualquier otro se revertia solo al mas reciente con datos. Eso dejaba dos
   * cosas imposibles -- planificar el presupuesto de septiembre, que por definicion no
   * tiene gastos todavia, y repasar un julio vacio para comprobar que lo esta.
   *
   * Ahora manda la persona: elige el periodo y cada modulo consulta ESE periodo y decide
   * que enseñar. Ninguno decide si el periodo se puede elegir.
   */
  const [mesAnalizado, setMesAnalizado] = useState(periodoDelSistema);

  const anioAnalizado = mesAnalizado.slice(0, 4);

  /*
   * El rango de anios se calcula desde el reloj del sistema, no desde la base de datos.
   * Un usuario nuevo, sin una sola transaccion, tiene que poder navegar igual que uno
   * con tres anios de historial.
   */
  const aniosDisponibles = useMemo(() => {
    const actual = new Date().getFullYear();
    return Array.from(
      { length: ANIOS_ATRAS + ANIOS_ADELANTE + 1 },
      (_, indice) => String(actual + ANIOS_ADELANTE - indice)
    );
  }, []);

  /*
   * Los meses que SI tienen movimientos. Es un dato sobre el contenido, no una lista de
   * navegacion: solo lo usa Transacciones para ofrecer "ir a un periodo con datos"
   * cuando el elegido esta vacio. No gobierna el selector.
   */
  const mesesConMovimientos = useMemo(() => {
    const meses = new Set<string>();
    transacciones.forEach((item) => {
      const mes = item.fecha.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(mes)) meses.add(mes);
    });
    return [...meses].sort().reverse();
  }, [transacciones]);

  const transaccionesDelMes = useMemo(
    () => movimientosDelMes(transacciones, mesAnalizado),
    [transacciones, mesAnalizado]
  );

  /**
   * Cambiar de mes re-deduce ingreso y endeudamiento de ESE mes, en la misma tanda de
   * setState. Si no, al pasar de agosto a julio se veria el ingreso de agosto contra los
   * gastos de julio; y si se dedujera en un efecto aparte, el analisis correria dos veces
   * y la primera dejaria una fila equivocada en el historial.
   *
   * SIEMPRE se asigna, incluso cuando deducirSupuestos() da null: si julio no tiene
   * transaccion de tipo 'ingreso', ingresoMensual pasa a null ("sin dato"), nunca se deja
   * el valor que traia agosto. Contaminar julio con un numero de otro periodo era el bug
   * -- silencioso porque nunca fallaba, solo mentia.
   */
  const seleccionarMes = useCallback((mes: string) => {
    setMesAnalizado(mes);
    const supuestos = deducirSupuestos(movimientosDelMes(transacciones, mes));
    setIngresoMensual(supuestos?.ingresoMensual ?? null);
    setNivelEndeudamiento(supuestos?.nivelEndeudamiento ?? null);
  }, [transacciones]);

  /**
   * Cambiar de anio conserva el mes: de agosto 2026 se pasa a agosto 2025, no a
   * diciembre. Antes, si ese mes no tenia movimientos, saltaba a otro; ahora no hay a
   * donde saltar porque cualquier mes es elegible.
   */
  const seleccionarAnio = useCallback((anio: string) => {
    seleccionarMes(`${anio}-${mesAnalizado.slice(5, 7)}`);
  }, [mesAnalizado, seleccionarMes]);

  const recargarHistorial = useCallback(async () => {
    if (token) setHistorial(await listarHistorial(token));
  }, [token]);

  /*
   * Un solo sitio pide los presupuestos: este efecto.
   *
   * Antes tambien los pedia recargarPresupuestos() despues de cada mutacion, con el
   * periodo capturado en su closure. Si alguien guardaba y cambiaba de mes antes de que
   * llegara la respuesta, esa respuesta pisaba los limites del mes nuevo. Ahora las
   * mutaciones solo suben un contador y el efecto vuelve a pedirlos leyendo el periodo
   * vigente, con su bandera para descartar respuestas que llegan tarde.
   */
  const recargarPresupuestos = useCallback(() => setRevisionPresupuestos((n) => n + 1), []);

  useEffect(() => {
    if (!token || !hidratado) return;
    let vigente = true;
    listarPresupuestos(token, mesAnalizado)
      .then((limites) => { if (vigente) setPresupuestos(limites); })
      .catch(() => { /* la pantalla conserva los limites que ya tenia */ });
    return () => { vigente = false; };
  }, [token, mesAnalizado, hidratado, revisionPresupuestos]);

  useEffect(() => {
    if (!token) {
      setTransacciones([]); setPresupuestos([]); setHistorial([]); setHidratado(false); setAnalisisListo(false);
      return;
    }
    setCargandoDatos(true);
    /*
     * Los presupuestos NO se piden aqui: los pide el efecto de arriba, que sabe que
     * periodo se esta mirando. Pedirlos sin periodo devolvia los del mes mas reciente
     * con movimientos y, si esa respuesta llegaba la ultima, dejaba en pantalla los
     * limites de un mes distinto al del encabezado.
     */
    Promise.all([listarTransacciones(token), listarHistorial(token)])
      .then(([movimientos, registros]) => {
        setTransacciones(movimientos); setHistorial(registros);
        // Deducir ANTES de marcar hidratado: el efecto que dispara el analisis depende de
        // hidratado, y React agrupa estos setState. Si se dedujera despues, el analisis
        // correria dos veces.
        const supuestos = deducirSupuestos(movimientosDelMes(movimientos, mesAnalizado));
        setIngresoMensual(supuestos?.ingresoMensual ?? null);
        setNivelEndeudamiento(supuestos?.nivelEndeudamiento ?? null);
        setHidratado(true);
      })
      .catch((error: Error) => setErrorAnalisis(error.message))
      .finally(() => setCargandoDatos(false));
    // Solo al entrar: cambiar de periodo no vuelve a descargar todo el historial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /*
   * Distingue un recalculo automatico (montar la app, cambiar de periodo, editar una
   * transaccion) de uno explicito (pulsar "Actualizar analisis", que es lo unico que
   * incrementa `revision`). Solo el segundo escribe en Historial: navegar por FinanceAI
   * no debe dejar un rastro de snapshots que nadie pidio.
   */
  const revisionGuardada = useRef(revision);

  /*
   * El analisis es del periodo seleccionado, y de ninguno mas.
   *
   * Cuando el periodo no tiene movimientos, o tiene movimientos pero no hay forma de
   * deducir un ingreso (ingresoMensual quedo en null), hay que BORRAR el resultado
   * anterior, no limitarse a no pedir uno nuevo: antes esta rama hacia return y en
   * pantalla se quedaba el diagnostico de agosto bajo el titulo de julio, con su perfil y
   * sus cifras, como si fueran de julio. Vaciarlo deja a cada pantalla en su estado de
   * "todavia no hay datos", que es la verdad.
   */
  useEffect(() => {
    if (!token || !hidratado) return;
    if (transaccionesDelMes.length === 0 || ingresoMensual === null || nivelEndeudamiento === null) {
      setAnalisis(analisisInicial);
      setAnalisisListo(false);
      setCargandoAnalisis(false);
      setErrorAnalisis('');
      return;
    }
    const esActualizacionExplicita = revision !== revisionGuardada.current;
    revisionGuardada.current = revision;
    const controller = new AbortController();
    setCargandoAnalisis(true); setErrorAnalisis('');
    solicitarAnalisisFinanciero(token, transaccionesDelMes, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, esActualizacionExplicita, controller.signal)
      .then(async (resultado) => {
        setAnalisis(resultado); setAnalisisListo(true);
        if (esActualizacionExplicita) await recargarHistorial();
      })
      .catch((error: Error) => { if (error.name !== 'AbortError') setErrorAnalisis(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCargandoAnalisis(false); });
    return () => controller.abort();
  }, [token, hidratado, transaccionesDelMes, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, revision, recargarHistorial]);

  /*
   * La fecha llega desde el formulario. Antes se forzaba siempre a hoy, asi que no
   * habia forma de registrar un movimiento pasado salvo importando un CSV. Se mantiene
   * el dia actual como valor por defecto para quien no la envie.
   */
  async function agregarTransaccion(data: { descripcion: string; categoria: CategoriaFinanciera | null; tipo: TipoTransaccion; monto: number; fecha?: string }) {
    if (!token) return;
    const nueva = await crearTransaccion(token, {
      descripcion: data.descripcion, categoria: data.categoria, tipo: data.tipo,
      fecha: data.fecha ?? new Date().toISOString().slice(0, 10), monto: Math.abs(data.monto)
    });
    const actualizadas = [nueva, ...transacciones];
    setTransacciones(actualizadas);
    const supuestos = deducirSupuestos(movimientosDelMes(actualizadas, mesAnalizado));
    setIngresoMensual(supuestos?.ingresoMensual ?? null);
    setNivelEndeudamiento(supuestos?.nivelEndeudamiento ?? null);
    recargarPresupuestos();
}

async function actualizarTransaccion(id: string, data: Omit<Transaccion, 'id'>) {
    if (!token) return;
    const actualizada = await actualizarTransaccionApi(token, id, data);
    const actualizadas = transacciones.map((item) => item.id === id ? actualizada : item);
    setTransacciones(actualizadas);
    const supuestos = deducirSupuestos(movimientosDelMes(actualizadas, mesAnalizado));
    setIngresoMensual(supuestos?.ingresoMensual ?? null);
    setNivelEndeudamiento(supuestos?.nivelEndeudamiento ?? null);
    recargarPresupuestos();
}

  /**
   * Categoria sugerida por el modelo para una descripcion de GASTO.
   *
   * No se guarda nada aqui: solo consulta. Quien llama decide que hacer si falla,
   * porque con el ML caido el cortacircuitos responde 502 y el alta no debe perderse.
   */
  async function clasificarDescripcion(descripcion: string, monto: number) {
    if (!token) throw new Error('Sesion no disponible.');
    return clasificarDescripcionApi(token, descripcion, Math.abs(monto));
  }

  /** Version por lote: una sola peticion para todos los gastos sin categoria de un CSV. */
  async function clasificarDescripciones(items: { descripcion: string; valor: number }[]) {
    if (!token) throw new Error('Sesion no disponible.');
    return clasificarDescripcionesApi(token, items);
  }

 async function eliminarTransaccion(id: string) {
    if (!token) return;
    await eliminarTransaccionApi(token, id);
    const actualizadas = transacciones.filter((item) => item.id !== id);
    setTransacciones(actualizadas);
    const supuestos = deducirSupuestos(movimientosDelMes(actualizadas, mesAnalizado));
    setIngresoMensual(supuestos?.ingresoMensual ?? null);
    setNivelEndeudamiento(supuestos?.nivelEndeudamiento ?? null);
    recargarPresupuestos();
}

async function importarTransacciones(items: Omit<Transaccion, 'id'>[]) {
    if (!token) return;
    const importadas = await importarTransaccionesApi(token, items);
    const actualizadas = [...importadas, ...transacciones];
    setTransacciones(actualizadas);
    const supuestos = deducirSupuestos(movimientosDelMes(actualizadas, mesAnalizado));
    setIngresoMensual(supuestos?.ingresoMensual ?? null);
    setNivelEndeudamiento(supuestos?.nivelEndeudamiento ?? null);
    recargarPresupuestos();
}

  /**
   * Varios limites de UN periodo, de una vez.
   *
   * El periodo llega explicito desde quien llama -- Presupuesto lo captura al abrir el
   * formulario -- y no se lee de mesAnalizado: si el selector del encabezado cambia
   * mientras el formulario esta abierto, lo guardado sigue siendo el mes que el
   * formulario dice estar editando.
   *
   * Despues se vuelve a consultar el periodo en vez de parchear el estado local: el
   * gasto de cada categoria lo calcula el backend y solo el sabe como queda el resumen.
   */
  async function guardarLimites(
    limites: { categoria: CategoriaFinanciera; presupuesto: number }[],
    mes: string | null
  ) {
    if (!token || limites.length === 0) return;
    await guardarPresupuestos(token, limites, mes);
    /*
     * No se parchea el estado con la respuesta: se pide de nuevo el periodo que se este
     * mirando. Si el formulario guardo agosto y el encabezado ya esta en septiembre, lo
     * correcto es que la pantalla siga enseñando septiembre.
     */
    recargarPresupuestos();
  }

  /**
   * Quita el limite de UNA categoria en el periodo dado -- "no le asigno presupuesto a
   * esta categoria", no "ponle un limite de cero". El periodo llega explicito por la
   * misma razon que en guardarLimites: es el que el formulario dice estar editando, no
   * necesariamente mesAnalizado.
   */
  async function eliminarLimite(categoria: CategoriaFinanciera, mes: string | null) {
    if (!token) return;
    await eliminarPresupuestoApi(token, categoria, mes);
    recargarPresupuestos();
  }

  async function eliminarAnalisis(id: number) {
    if (!token) return;
    await eliminarAnalisisApi(token, id);
    setHistorial((actual) => actual.filter((item) => item.id !== id));
  }

  /**
   * Recalcula el analisis del periodo seleccionado -- es lo unico que "Actualizar
   * analisis" dispara, y lo unico que marca un recalculo como explicito (ver el efecto
   * de arriba).
   *
   * Sin argumento: usa lo que ya se sabe del periodo (el ingreso deducido de sus
   * transacciones). Con argumento: el ingreso lo declara la persona, porque el periodo no
   * tenia transaccion de tipo 'ingreso' de donde deducirlo -- caso que la pantalla ya
   * detecto antes de pedirlo.
   *
   * nivelEndeudamiento NUNCA se recibe como argumento: siempre se recalcula aqui mismo a
   * partir de los gastos categoria 'deudas' del periodo (calcularNivelEndeudamiento da 0%
   * si no hay ninguno). No es un dato que pueda faltar, asi que no se le pide a nadie.
   */
  const generarAnalisis = useCallback((ingresoDeclarado?: number) => {
    const movimientos = movimientosDelMes(transacciones, mesAnalizado);
    const ingreso = ingresoDeclarado ?? deducirSupuestos(movimientos)?.ingresoMensual ?? null;
    if (ingreso === null) return;
    setIngresoMensual(ingreso);
    setNivelEndeudamiento(calcularNivelEndeudamiento(movimientos, ingreso));
    setRevision((actual) => actual + 1);
  }, [transacciones, mesAnalizado]);

  function obtenerCategoria(transaccion: Transaccion): CategoriaFinanciera | null {
    // Ingresos y ahorros no tienen categoria: no hay nada que inferir.
    if (transaccion.tipo !== 'gasto') return null;
    return analisis.clasificaciones.find((item) => item.descripcion === transaccion.descripcion)?.categoria ?? transaccion.categoria;
  }

  return {
    transacciones, transaccionesDelMes, mesAnalizado, mesesConMovimientos, seleccionarMes,
    anioAnalizado, aniosDisponibles, seleccionarAnio, presupuestos, historial, analisis, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro,
    cargandoDatos, cargandoAnalisis, errorAnalisis, analisisListo, hidratado, agregarTransaccion, actualizarTransaccion, clasificarDescripcion, clasificarDescripciones,
    eliminarTransaccion, importarTransacciones, guardarLimites, eliminarLimite, eliminarAnalisis, generarAnalisis, obtenerCategoria
  };
}

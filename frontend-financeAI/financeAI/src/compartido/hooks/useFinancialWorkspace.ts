import { useCallback, useEffect, useMemo, useState } from 'react';
import { analisisInicial, solicitarAnalisisFinanciero } from '../servicios/analisisFinanciero.service';
import {
  actualizarTransaccion as actualizarTransaccionApi,
  clasificarDescripcion as clasificarDescripcionApi,
  clasificarDescripciones as clasificarDescripcionesApi,
  crearTransaccion,
  eliminarAnalisis as eliminarAnalisisApi,
  eliminarTransaccion as eliminarTransaccionApi,
  guardarPresupuestos,
  importarTransacciones as importarTransaccionesApi,
  listarHistorial,
  listarPresupuestos,
  listarTransacciones
} from '../servicios/persistencia.service';
import type { CategoriaFinanciera, HistorialAnalisis, TipoTransaccion, Transaccion } from '../tipos/finanzas';

const INGRESO_POR_DEFECTO = 4500;
const ENDEUDAMIENTO_POR_DEFECTO = 25;

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
 * Deriva el ingreso mensual y el nivel de endeudamiento de los movimientos del usuario.
 *
 * Antes estos dos valores estaban fijos en 4500 y 25, y el analisis se disparaba solo al
 * cargar la app. Con movimientos en otra escala (ej. pesos colombianos) eso producia un
 * ratio gasto/ingreso absurdo y un perfil "En riesgo" con probabilidad 0.00, aunque los
 * datos en la base fueran perfectamente coherentes.
 *
 * Si el usuario no tiene movimientos de tipo 'ingreso' no hay de donde deducirlo y se
 * mantienen los valores por defecto: en ese caso el numero lo tiene que poner a mano en
 * la pantalla de Analisis.
 */
function deducirSupuestos(movimientos: Transaccion[]) {
  const ingreso = movimientos
    .filter((item) => item.tipo === 'ingreso')
    .reduce((suma, item) => suma + Math.abs(item.monto), 0);

  if (ingreso <= 0) return null;

  const deuda = movimientos
    .filter((item) => item.tipo === 'gasto' && item.categoria === 'deudas')
    .reduce((suma, item) => suma + Math.abs(item.monto), 0);

  return {
    ingresoMensual: ingreso,
    // El backend valida 0..100; un mes con mas deuda que ingreso no debe romper el analisis.
    nivelEndeudamiento: Math.min(100, Math.round((deuda / ingreso) * 1000) / 10)
  };
}

export function useFinancialWorkspace(token: string | null) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [presupuestos, setPresupuestos] = useState<Awaited<ReturnType<typeof listarPresupuestos>>>([]);
  const [historial, setHistorial] = useState<HistorialAnalisis[]>([]);
  const [analisis, setAnalisis] = useState(analisisInicial);
  const [ingresoMensual, setIngresoMensual] = useState(INGRESO_POR_DEFECTO);
  const [nivelEndeudamiento, setNivelEndeudamiento] = useState(ENDEUDAMIENTO_POR_DEFECTO);
  const [frecuenciaAhorro, setFrecuenciaAhorro] = useState<'Alta' | 'Media' | 'Baja'>('Media');
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
   */
  const seleccionarMes = useCallback((mes: string) => {
    setMesAnalizado(mes);
    const supuestos = deducirSupuestos(movimientosDelMes(transacciones, mes));
    if (supuestos) {
      setIngresoMensual(supuestos.ingresoMensual);
      setNivelEndeudamiento(supuestos.nivelEndeudamiento);
    }
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
        // correria dos veces y la primera guardaria en el historial una fila calculada con
        // los valores por defecto.
        const supuestos = deducirSupuestos(movimientosDelMes(movimientos, mesAnalizado));
        if (supuestos) {
          setIngresoMensual(supuestos.ingresoMensual);
          setNivelEndeudamiento(supuestos.nivelEndeudamiento);
        }
        setHidratado(true);
      })
      .catch((error: Error) => setErrorAnalisis(error.message))
      .finally(() => setCargandoDatos(false));
    // Solo al entrar: cambiar de periodo no vuelve a descargar todo el historial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /*
   * El analisis es del periodo seleccionado, y de ninguno mas.
   *
   * Cuando el periodo no tiene movimientos hay que BORRAR el resultado anterior, no
   * limitarse a no pedir uno nuevo: antes esta rama hacia return y en pantalla se quedaba
   * el diagnostico de agosto bajo el titulo de julio, con su perfil y sus cifras, como si
   * fueran de julio. Vaciarlo deja a cada pantalla en su estado de "todavia no hay datos",
   * que es la verdad.
   */
  useEffect(() => {
    if (!token || !hidratado) return;
    if (transaccionesDelMes.length === 0) {
      setAnalisis(analisisInicial);
      setAnalisisListo(false);
      setCargandoAnalisis(false);
      setErrorAnalisis('');
      return;
    }
    const controller = new AbortController();
    setCargandoAnalisis(true); setErrorAnalisis('');
    solicitarAnalisisFinanciero(token, transaccionesDelMes, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, controller.signal)
      .then(async (resultado) => { setAnalisis(resultado); setAnalisisListo(true); await recargarHistorial(); })
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
    if (supuestos) {
      setIngresoMensual(supuestos.ingresoMensual);
      setNivelEndeudamiento(supuestos.nivelEndeudamiento);
    }
    recargarPresupuestos();
}

async function actualizarTransaccion(id: string, data: Omit<Transaccion, 'id'>) {
    if (!token) return;
    const actualizada = await actualizarTransaccionApi(token, id, data);
    const actualizadas = transacciones.map((item) => item.id === id ? actualizada : item);
    setTransacciones(actualizadas);
    const supuestos = deducirSupuestos(movimientosDelMes(actualizadas, mesAnalizado));
    if (supuestos) {
      setIngresoMensual(supuestos.ingresoMensual);
      setNivelEndeudamiento(supuestos.nivelEndeudamiento);
    }
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
    if (supuestos) {
      setIngresoMensual(supuestos.ingresoMensual);
      setNivelEndeudamiento(supuestos.nivelEndeudamiento);
    }
    recargarPresupuestos();
}

async function importarTransacciones(items: Omit<Transaccion, 'id'>[]) {
    if (!token) return;
    const importadas = await importarTransaccionesApi(token, items);
    const actualizadas = [...importadas, ...transacciones];
    setTransacciones(actualizadas);
    const supuestos = deducirSupuestos(movimientosDelMes(actualizadas, mesAnalizado));
    if (supuestos) {
      setIngresoMensual(supuestos.ingresoMensual);
      setNivelEndeudamiento(supuestos.nivelEndeudamiento);
    }
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

  async function eliminarAnalisis(id: number) {
    if (!token) return;
    await eliminarAnalisisApi(token, id);
    setHistorial((actual) => actual.filter((item) => item.id !== id));
  }

  const generarAnalisis = useCallback((datos: { ingresoMensual: number; nivelEndeudamiento: number; frecuenciaAhorro: 'Alta' | 'Media' | 'Baja' }) => {
    setIngresoMensual(datos.ingresoMensual); setNivelEndeudamiento(datos.nivelEndeudamiento);
    setFrecuenciaAhorro(datos.frecuenciaAhorro); setRevision((actual) => actual + 1);
  }, []);

  function obtenerCategoria(transaccion: Transaccion): CategoriaFinanciera | null {
    // Ingresos y ahorros no tienen categoria: no hay nada que inferir.
    if (transaccion.tipo !== 'gasto') return null;
    return analisis.clasificaciones.find((item) => item.descripcion === transaccion.descripcion)?.categoria ?? transaccion.categoria;
  }

  return {
    transacciones, transaccionesDelMes, mesAnalizado, mesesConMovimientos, seleccionarMes,
    anioAnalizado, aniosDisponibles, seleccionarAnio, presupuestos, historial, analisis, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro,
    cargandoDatos, cargandoAnalisis, errorAnalisis, analisisListo, hidratado, agregarTransaccion, actualizarTransaccion, clasificarDescripcion, clasificarDescripciones,
    eliminarTransaccion, importarTransacciones, guardarLimites, eliminarAnalisis, generarAnalisis, obtenerCategoria
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { analisisInicial, solicitarAnalisisFinanciero } from '../servicios/analisisFinanciero.service';
import {
  actualizarTransaccion as actualizarTransaccionApi,
  crearTransaccion,
  eliminarAnalisis as eliminarAnalisisApi,
  eliminarTransaccion as eliminarTransaccionApi,
  guardarPresupuesto,
  importarTransacciones as importarTransaccionesApi,
  listarHistorial,
  listarPresupuestos,
  listarTransacciones
} from '../servicios/persistencia.service';
import type { CategoriaFinanciera, HistorialAnalisis, TipoTransaccion, Transaccion } from '../tipos/finanzas';

const INGRESO_POR_DEFECTO = 4500;
const ENDEUDAMIENTO_POR_DEFECTO = 25;

/**
 * Mes mas reciente que tiene movimientos, en formato YYYY-MM.
 *
 * El analisis se llama "gasto_total_mes" pero no habia ningun filtro por fecha: se
 * enviaban TODAS las transacciones del usuario, asi que con tres meses cargados el
 * gasto se triplicaba y el perfil salia peor de lo real.
 *
 * Se elige el mes mas reciente con datos, y no el mes calendario actual, para que la
 * app siga mostrando algo cuando los movimientos son de meses anteriores -- con el mes
 * actual, importar un CSV viejo dejaba el tablero en cero sin explicar por que.
 *
 * Las fechas llegan de la API como YYYY-MM-DD, asi que comparar los primeros 7
 * caracteres como texto ya ordena cronologicamente.
 */
function mesMasReciente(movimientos: Transaccion[]): string | null {
  return movimientos.reduce<string | null>((reciente, item) => {
    const mes = item.fecha.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return reciente;
    return reciente === null || mes > reciente ? mes : reciente;
  }, null);
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
  const [hidratado, setHidratado] = useState(false);

  // El analisis y los totales miran UN mes. La lista de transacciones sigue mostrando
  // todo el historial: es un libro de movimientos, no un resumen mensual.
  const mesAnalizado = useMemo(() => mesMasReciente(transacciones), [transacciones]);
  const transaccionesDelMes = useMemo(
    () => movimientosDelMes(transacciones, mesAnalizado),
    [transacciones, mesAnalizado]
  );

  const recargarHistorial = useCallback(async () => {
    if (token) setHistorial(await listarHistorial(token));
  }, [token]);

  const recargarPresupuestos = useCallback(async () => {
    if (token) setPresupuestos(await listarPresupuestos(token));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setTransacciones([]); setPresupuestos([]); setHistorial([]); setHidratado(false);
      return;
    }
    setCargandoDatos(true);
    Promise.all([listarTransacciones(token), listarPresupuestos(token), listarHistorial(token)])
      .then(([movimientos, limites, registros]) => {
        setTransacciones(movimientos); setPresupuestos(limites); setHistorial(registros);
        // Deducir ANTES de marcar hidratado: el efecto que dispara el analisis depende de
        // hidratado, y React agrupa estos setState. Si se dedujera despues, el analisis
        // correria dos veces y la primera guardaria en el historial una fila calculada con
        // los valores por defecto.
        const supuestos = deducirSupuestos(movimientosDelMes(movimientos, mesMasReciente(movimientos)));
        if (supuestos) {
          setIngresoMensual(supuestos.ingresoMensual);
          setNivelEndeudamiento(supuestos.nivelEndeudamiento);
        }
        setHidratado(true);
      })
      .catch((error: Error) => setErrorAnalisis(error.message))
      .finally(() => setCargandoDatos(false));
  }, [token]);

  useEffect(() => {
    if (!token || !hidratado || transaccionesDelMes.length === 0) return;
    const controller = new AbortController();
    setCargandoAnalisis(true); setErrorAnalisis('');
    solicitarAnalisisFinanciero(token, transaccionesDelMes, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, controller.signal)
      .then(async (resultado) => { setAnalisis(resultado); await recargarHistorial(); })
      .catch((error: Error) => { if (error.name !== 'AbortError') setErrorAnalisis(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCargandoAnalisis(false); });
    return () => controller.abort();
  }, [token, hidratado, transaccionesDelMes, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, revision, recargarHistorial]);

  async function agregarTransaccion(data: { descripcion: string; categoria: CategoriaFinanciera; tipo: TipoTransaccion; monto: number }) {
    if (!token) return;
    const nueva = await crearTransaccion(token, {
      descripcion: data.descripcion, categoria: data.categoria, tipo: data.tipo,
      fecha: new Date().toISOString().slice(0, 10), monto: Math.abs(data.monto)
    });
    setTransacciones((actuales) => [nueva, ...actuales]);
    await recargarPresupuestos();
  }

  async function actualizarTransaccion(id: string, data: Omit<Transaccion, 'id'>) {
    if (!token) return;
    const actualizada = await actualizarTransaccionApi(token, id, data);
    setTransacciones((actuales) => actuales.map((item) => item.id === id ? actualizada : item));
    await recargarPresupuestos();
  }

  async function eliminarTransaccion(id: string) {
    if (!token) return;
    await eliminarTransaccionApi(token, id);
    setTransacciones((actuales) => actuales.filter((item) => item.id !== id));
    await recargarPresupuestos();
  }

  async function importarTransacciones(items: Omit<Transaccion, 'id'>[]) {
    if (!token) return;
    const importadas = await importarTransaccionesApi(token, items);
    setTransacciones((actuales) => [...importadas, ...actuales]);
    await recargarPresupuestos();
  }

  async function agregarPresupuesto(data: { categoria: CategoriaFinanciera; presupuesto: number }) {
    if (!token) return;
    const guardado = await guardarPresupuesto(token, data.categoria, data.presupuesto);
    setPresupuestos((actuales) => actuales.some((item) => item.categoria === guardado.categoria)
      ? actuales.map((item) => item.categoria === guardado.categoria ? guardado : item)
      : [...actuales, guardado]);
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

  function obtenerCategoria(transaccion: Transaccion): CategoriaFinanciera {
    if (transaccion.tipo !== 'gasto') return transaccion.categoria;
    return analisis.clasificaciones.find((item) => item.descripcion === transaccion.descripcion)?.categoria ?? transaccion.categoria;
  }

  return {
    transacciones, transaccionesDelMes, mesAnalizado, presupuestos, historial, analisis, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro,
    cargandoDatos, cargandoAnalisis, errorAnalisis, agregarTransaccion, actualizarTransaccion,
    eliminarTransaccion, importarTransacciones, agregarPresupuesto, eliminarAnalisis, generarAnalisis, obtenerCategoria
  };
}

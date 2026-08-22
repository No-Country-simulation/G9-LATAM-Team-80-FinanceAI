import { useCallback, useEffect, useState } from 'react';
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

export function useFinancialWorkspace(token: string | null) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [presupuestos, setPresupuestos] = useState<Awaited<ReturnType<typeof listarPresupuestos>>>([]);
  const [historial, setHistorial] = useState<HistorialAnalisis[]>([]);
  const [analisis, setAnalisis] = useState(analisisInicial);
  const [ingresoMensual, setIngresoMensual] = useState(4500);
  const [nivelEndeudamiento, setNivelEndeudamiento] = useState(25);
  const [frecuenciaAhorro, setFrecuenciaAhorro] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState('');
  const [revision, setRevision] = useState(0);
  const [hidratado, setHidratado] = useState(false);

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
        setTransacciones(movimientos); setPresupuestos(limites); setHistorial(registros); setHidratado(true);
      })
      .catch((error: Error) => setErrorAnalisis(error.message))
      .finally(() => setCargandoDatos(false));
  }, [token]);

  useEffect(() => {
    if (!token || !hidratado || transacciones.length === 0) return;
    const controller = new AbortController();
    setCargandoAnalisis(true); setErrorAnalisis('');
    solicitarAnalisisFinanciero(token, transacciones, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, controller.signal)
      .then(async (resultado) => { setAnalisis(resultado); await recargarHistorial(); })
      .catch((error: Error) => { if (error.name !== 'AbortError') setErrorAnalisis(error.message); })
      .finally(() => { if (!controller.signal.aborted) setCargandoAnalisis(false); });
    return () => controller.abort();
  }, [token, hidratado, transacciones, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro, revision, recargarHistorial]);

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
    transacciones, presupuestos, historial, analisis, ingresoMensual, nivelEndeudamiento, frecuenciaAhorro,
    cargandoDatos, cargandoAnalisis, errorAnalisis, agregarTransaccion, actualizarTransaccion,
    eliminarTransaccion, importarTransacciones, agregarPresupuesto, eliminarAnalisis, generarAnalisis, obtenerCategoria
  };
}

import { useMemo, useState } from 'react';
import { presupuestosIniciales, transaccionesIniciales } from '../constantes/datosDemo';
import { generarAnalisisFinanciero } from '../servicios/analisisFinanciero.service';
import type { CategoriaFinanciera, TipoTransaccion, Transaccion } from '../tipos/finanzas';

export function useFinancialWorkspace() {
  const [transacciones, setTransacciones] = useState(transaccionesIniciales);
  const [presupuestos, setPresupuestos] = useState(presupuestosIniciales);

  const analisis = useMemo(() => generarAnalisisFinanciero(transacciones), [transacciones]);

  function agregarTransaccion(data: {
    descripcion: string;
    categoria: CategoriaFinanciera;
    tipo: TipoTransaccion;
    monto: number;
  }) {
    const signo = data.tipo === 'ingreso' ? 1 : -1;
    const nuevaTransaccion: Transaccion = {
      id: `t-${Date.now()}`,
      descripcion: data.descripcion,
      categoria: data.categoria,
      tipo: data.tipo,
      fecha: '23 Jul 2026',
      monto: Math.abs(data.monto) * signo
    };

    setTransacciones((actuales) => [nuevaTransaccion, ...actuales]);
  }

  function eliminarTransaccion(id: string) {
    setTransacciones((actuales) => actuales.filter((transaccion) => transaccion.id !== id));
  }

  function agregarPresupuesto(data: {
    categoria: CategoriaFinanciera;
    presupuesto: number;
  }) {
    setPresupuestos((actuales) => {
      const existente = actuales.find((item) => item.categoria === data.categoria);

      if (existente) {
        return actuales.map((item) =>
          item.categoria === data.categoria
            ? { ...item, presupuesto: data.presupuesto }
            : item
        );
      }

      return [...actuales, { categoria: data.categoria, presupuesto: data.presupuesto, gastado: 0 }];
    });
  }

  return {
    transacciones,
    presupuestos,
    analisis,
    agregarTransaccion,
    eliminarTransaccion,
    agregarPresupuesto
  };
}

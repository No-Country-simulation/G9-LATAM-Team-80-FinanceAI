import { ArrowLeft, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import type { CategoriaFinanciera } from '../../../compartido/tipos/finanzas';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Card, PageHeader } from '../../tablero/presentacion/DashboardPage';

export function BudgetsPage({ workspace }: PageProps) {
  const [vista, setVista] = useState<'listado' | 'nuevo'>('listado');
  const [categoria, setCategoria] = useState<CategoriaFinanciera>('alimentacion');
  const [presupuesto, setPresupuesto] = useState('1200');
  const presupuestoTotal = workspace.presupuestos.reduce((sum, item) => sum + item.presupuesto, 0);
  const gastadoTotal = workspace.presupuestos.reduce((sum, item) => sum + item.gastado, 0);
  const disponible = presupuestoTotal - gastadoTotal;

  function guardarPresupuesto(event: React.FormEvent) {
    event.preventDefault();
    workspace.agregarPresupuesto({ categoria, presupuesto: Number(presupuesto) });
    setVista('listado');
  }

  if (vista === 'nuevo') {
    return (
      <section className="page-stack">
        <PageHeader
          title="Nuevo presupuesto"
          subtitle="Define un limite mensual para una categoria financiera."
          action={<button className="outline-button" onClick={() => setVista('listado')}><ArrowLeft size={18} /> Volver</button>}
        />
        <form className="subview-card form-panel" onSubmit={guardarPresupuesto}>
          <label>Categoria<select value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaFinanciera)}>
            {Object.entries(etiquetasCategoria).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label>Presupuesto mensual<input value={presupuesto} onChange={(event) => setPresupuesto(event.target.value)} type="number" min="1" /></label>
          <div className="budget-preview">
            <span>Disponible inicial</span>
            <strong>{formatCurrency(Number(presupuesto || 0))}</strong>
            <p>Este limite se usara para alertas y recomendaciones por categoria.</p>
          </div>
          <div className="form-actions">
            <button className="outline-button" type="button" onClick={() => setVista('listado')}>Cancelar</button>
            <button className="primary-button" type="submit"><Plus size={18} /> Guardar presupuesto</button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Presupuesto"
        subtitle="Planifica y controla tu presupuesto mensual."
        action={<button className="primary-button" onClick={() => setVista('nuevo')}><Plus size={18} /> Nuevo presupuesto</button>}
      />
      <div className="two-column-grid budget-top">
        <Card title="Resumen del presupuesto">
          <div className="budget-summary">
            <span>Presupuesto mensual</span>
            <strong>{formatCurrency(presupuestoTotal)}</strong>
            <p>Gastado <b className="negative">{formatCurrency(-gastadoTotal)}</b> ({formatPercent((gastadoTotal / presupuestoTotal) * 100)})</p>
            <div><span style={{ width: `${(gastadoTotal / presupuestoTotal) * 100}%` }} /></div>
            <p>Disponible <b className="positive">{formatCurrency(disponible)}</b></p>
          </div>
        </Card>
        <Card title="Progreso por categoria">
          <div className="category-bars compact">
            {workspace.presupuestos.map((item) => (
              <div key={item.categoria}>
                <p><span>{etiquetasCategoria[item.categoria]}</span><strong>{formatPercent((item.gastado / item.presupuesto) * 100)}</strong></p>
                <div><span style={{ width: `${(item.gastado / item.presupuesto) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Limites por categoria">
        <table className="data-table roomy">
          <thead><tr><th>Categoria</th><th>Presupuesto</th><th>Gastado</th><th>Disponible</th><th>% Utilizado</th></tr></thead>
          <tbody>
            {workspace.presupuestos.map((item) => (
              <tr key={item.categoria}>
                <td>{etiquetasCategoria[item.categoria]}</td>
                <td>{formatCurrency(item.presupuesto)}</td>
                <td>{formatCurrency(item.gastado)}</td>
                <td className="positive">{formatCurrency(item.presupuesto - item.gastado)}</td>
                <td>{formatPercent((item.gastado / item.presupuesto) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

import { DownloadSimple, Eye, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { HistorialAnalisis } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Badge, Card, MetricCard, PageHeader } from '../../tablero/presentacion/DashboardPage';

export function HistoryPage({ workspace }: PageProps) {
  const [seleccionado, setSeleccionado] = useState<HistorialAnalisis | null>(null);
  const saludables = workspace.historial.filter((item) => item.perfilFinanciero === 'Saludable').length;
  const ahorro = workspace.historial.reduce((total, item) => total + item.ahorroTotal, 0);

  function descargar(item: HistorialAnalisis) {
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `analisis-financeai-${item.id}.json`; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="page-stack">
    <PageHeader title="Historial de analisis" subtitle="Consulta los analisis guardados en tu cuenta." />
    <div className="metric-grid">
      <MetricCard icon={<Eye size={30} />} title="Analisis realizados" value={String(workspace.historial.length)} tone="green" />
      <MetricCard icon={<Eye size={30} />} title="Perfiles saludables" value={String(saludables)} tone="blue" />
      <MetricCard icon={<Eye size={30} />} title="Ultimo perfil" value={workspace.historial[0]?.perfilFinanciero ?? 'Sin datos'} tone="orange" />
      <MetricCard icon={<Eye size={30} />} title="Ahorro registrado" value={formatCurrency(ahorro)} tone="blue" />
    </div>
    {seleccionado && <Card title="Detalle seleccionado">
      <div className="indicator-list">
        <p><span>Fecha</span><strong>{new Date(seleccionado.fecha).toLocaleString('es-PE')}</strong></p>
        <p><span>Ingreso</span><strong>{formatCurrency(seleccionado.ingresoMensual)}</strong></p>
        <p><span>Gasto</span><strong>{formatCurrency(seleccionado.gastoTotalMes)}</strong></p>
        <p><span>Ahorro</span><strong>{formatCurrency(seleccionado.ahorroTotal)}</strong></p>
      </div>
    </Card>}
    <Card title="Historial de analisis">
      <table className="data-table roomy">
        <thead><tr><th>Fecha y hora</th><th>Ingreso</th><th>Endeudamiento</th><th>Ahorro</th><th>Perfil</th><th>Probabilidad</th><th>Acciones</th></tr></thead>
        <tbody>{workspace.historial.map((item) => <tr key={item.id}>
          <td>{new Date(item.fecha).toLocaleString('es-PE')}</td><td>{formatCurrency(item.ingresoMensual)}</td>
          <td>{formatPercent(item.nivelEndeudamiento)}</td><td>{formatCurrency(item.ahorroTotal)}</td>
          <td><Badge tone={item.perfilFinanciero === 'Saludable' ? 'green' : item.perfilFinanciero === 'En riesgo' ? 'red' : 'orange'}>{item.perfilFinanciero}</Badge></td>
          <td>{formatPercent(item.probabilidad * 100)}</td>
          <td className="table-actions"><button aria-label="Ver" onClick={() => setSeleccionado(item)}><Eye size={18} /></button>
            <button aria-label="Descargar" onClick={() => descargar(item)}><DownloadSimple size={18} /></button>
            <button aria-label="Eliminar" onClick={() => workspace.eliminarAnalisis(item.id)}><Trash size={18} /></button></td>
        </tr>)}</tbody>
      </table>
      {!workspace.historial.length && <p className="muted-copy">Todavia no hay analisis guardados.</p>}
    </Card>
  </section>;
}

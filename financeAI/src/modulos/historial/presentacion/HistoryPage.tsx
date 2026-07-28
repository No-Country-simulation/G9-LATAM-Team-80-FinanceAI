import { DownloadSimple, Eye, Trash } from '@phosphor-icons/react';
import { formatCurrency } from '../../../compartido/utilidades/formato';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Badge, Card, MetricCard, PageHeader } from '../../tablero/presentacion/DashboardPage';

const historial = [
  ['31 May 2025 - 10:30 AM', 4500, '25%', 'Media', 'En observacion', '0.82'],
  ['25 May 2025 - 09:15 AM', 4500, '28%', 'Media', 'En observacion', '0.75'],
  ['20 May 2025 - 08:45 AM', 4300, '30%', 'Baja', 'En observacion', '0.70'],
  ['15 May 2025 - 11:20 AM', 4300, '22%', 'Alta', 'Saludable', '0.92'],
  ['10 May 2025 - 07:50 AM', 4000, '35%', 'Baja', 'En riesgo', '0.55']
];

export function HistoryPage(_: PageProps) {
  return (
    <section className="page-stack">
      <PageHeader title="Historial de analisis" subtitle="Consulta tus analisis financieros realizados en el tiempo." />
      <div className="metric-grid">
        <MetricCard icon={<Eye size={30} />} title="Analisis realizados" value="12" tone="green" />
        <MetricCard icon={<Eye size={30} />} title="Mejor perfil alcanzado" value="Saludable" tone="blue" />
        <MetricCard icon={<Eye size={30} />} title="Mejora del perfil" value="+ 0.28" tone="orange" />
        <MetricCard icon={<Eye size={30} />} title="Ahorro total estimado" value="$ 1,250.00" tone="blue" />
      </div>
      <Card title="Historial de analisis">
        <table className="data-table roomy">
          <thead><tr><th>Fecha y hora</th><th>Ingresos mensuales</th><th>Nivel de endeudamiento</th><th>Frecuencia de ahorro</th><th>Perfil financiero</th><th>Probabilidad</th><th>Acciones</th></tr></thead>
          <tbody>
            {historial.map((row) => (
              <tr key={row[0]}>
                <td>{row[0]}</td>
                <td>{formatCurrency(Number(row[1]))}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td><Badge tone={row[4] === 'Saludable' ? 'green' : row[4] === 'En riesgo' ? 'red' : 'orange'}>{row[4]}</Badge></td>
                <td>{row[5]}</td>
                <td className="table-actions"><button><Eye size={18} /></button><button><DownloadSimple size={18} /></button><button><Trash size={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

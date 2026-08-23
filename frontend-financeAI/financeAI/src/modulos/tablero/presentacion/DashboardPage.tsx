import { ArrowRight, PiggyBank, TrendDown, TrendUp, Wallet } from '@phosphor-icons/react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { gastosSinDeudas } from '../../../compartido/servicios/analisisFinanciero.service';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { PageProps } from '../../../compartido/tipos/workspace';

export function DashboardPage({ workspace, navegar }: PageProps) {
  // Sin deudas, para que esta cifra coincida con el gasto_total_mes que sostiene el perfil.
  // El pago de deuda se ve en la tarjeta de nivel de endeudamiento.
  const { resumen: resumenGastos, total: gastoTotal } = gastosSinDeudas(workspace.analisis.resumenGastos);

  return (
    <section className="page-stack">
      <PageHeader title="Resumen financiero" subtitle="Datos actualizados desde tu cuenta." />
      <div className="metric-grid">
        <MetricCard icon={<Wallet size={30} />} title="Ingreso mensual" value={formatCurrency(workspace.analisis.ingresoMensual)} tone="green" />
        <MetricCard icon={<TrendDown size={30} />} title="Gasto total" value={formatCurrency(-gastoTotal)} tone="red" />
        <MetricCard icon={<PiggyBank size={30} />} title="Ahorro registrado" value={formatCurrency(workspace.analisis.ahorroTotal)} tone="blue" />
        <MetricCard icon={<TrendUp size={30} />} title="Nivel de endeudamiento" value={formatPercent(workspace.analisis.nivelEndeudamiento)} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <Card title="Distribucion de gastos por categoria" className="span-2">
          <CategoryDonut resumen={resumenGastos} total={gastoTotal} />
          <button className="link-button" onClick={() => navegar('analisis')}>Ver detalle de categorias <ArrowRight size={18} /></button>
        </Card>
        <Card title="Tu perfil financiero">
          <ProfileBanner perfil={workspace.analisis.perfilFinanciero} probabilidad={workspace.analisis.probabilidad} />
          <p className="muted-text">Tu comportamiento financiero muestra algunos riesgos que puedes mejorar.</p>
          <button className="outline-button" onClick={() => navegar('analisis')}>Ver analisis completo</button>
        </Card>
        <Card title="Recomendaciones para ti">
          <div className="compact-list">
            {workspace.analisis.recomendaciones.slice(0, 3).map((recomendacion) => (
              <button key={recomendacion.id} onClick={() => navegar('recomendaciones')}>
                <span>{recomendacion.titulo}</span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </Card>
        <Card title="Ultimas transacciones" className="span-2">
          <table className="data-table">
            <tbody>
              {workspace.transacciones.slice(0, 5).map((transaccion) => (
                <tr key={transaccion.id}>
                  <td>{transaccion.descripcion}</td>
                  <td><Badge>{etiquetasCategoria[transaccion.categoria]}</Badge></td>
                  <td>{transaccion.fecha}</td>
                  <td className={transaccion.monto < 0 ? 'negative' : 'positive'}>{formatCurrency(transaccion.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Evolucion de gastos" className="span-2">
          <LineChart transacciones={workspace.transacciones} />
        </Card>
      </div>
    </section>
  );
}

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
        <p>{delta ? `${delta} vs. mes anterior` : 'Datos actuales'}</p>
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

function CategoryDonut({ resumen, total }: { resumen: Record<string, number>; total: number }) {
  const rows = Object.entries(resumen).filter(([, value]) => value > 0).slice(0, 6);

  return (
    <div className="donut-layout">
      <div className="donut"><span>Total<br /><strong>{formatCurrency(total)}</strong></span></div>
      <div className="legend-list">
        {rows.map(([categoria, valor]) => (
          <div key={categoria}>
            <span>{etiquetasCategoria[categoria as keyof typeof etiquetasCategoria]}</span>
            <strong>{formatCurrency(valor)}</strong>
            <small>{formatPercent(total > 0 ? (valor / total) * 100 : 0)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ transacciones }: { transacciones: PageProps['workspace']['transacciones'] }) {
  const agrupadas = new Map<string, number>();
  transacciones.filter((item) => item.tipo === 'gasto').forEach((item) => {
    const fecha = new Date(`${item.fecha}T00:00:00`);
    const key = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit' }).format(fecha);
    agrupadas.set(key, (agrupadas.get(key) ?? 0) + Math.abs(item.monto));
  });
  const evolucionMensual = [...agrupadas.entries()].slice(-6).map(([mes, gastos]) => ({ mes, gastos }));
  const max = Math.max(1, ...evolucionMensual.map((item) => item.gastos));
  return (
    <div className="line-chart">
      {evolucionMensual.map((item) => (
        <div key={item.mes}>
          <span style={{ height: `${(item.gastos / max) * 100}%` }} />
          <small>{item.mes}</small>
        </div>
      ))}
    </div>
  );
}

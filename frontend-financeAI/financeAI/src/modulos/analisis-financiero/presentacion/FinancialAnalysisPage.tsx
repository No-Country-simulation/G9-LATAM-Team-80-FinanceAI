import { ArrowLeft, CheckCircle, DownloadSimple, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { etiquetasCategoria } from '../../../compartido/constantes/categorias';
import { formatCurrency, formatPercent } from '../../../compartido/utilidades/formato';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Card, PageHeader, ProfileBanner } from '../../tablero/presentacion/DashboardPage';

type AnalysisTab = 'resumen' | 'categorias' | 'indicadores' | 'detalles';

export function FinancialAnalysisPage({ workspace }: PageProps) {
  const [vista, setVista] = useState<'resumen' | 'nuevo'>('resumen');
  const [tabActiva, setTabActiva] = useState<AnalysisTab>('resumen');
  const total = Object.values(workspace.analisis.resumenGastos).reduce((sum, value) => sum + value, 0);
  const rows = Object.entries(workspace.analisis.resumenGastos)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (vista === 'nuevo') return <NewAnalysisView workspace={workspace} onBack={() => setVista('resumen')} />;

  return <section className="page-stack">
    <PageHeader title="Analisis financiero" subtitle="Resultados actualizados de tu salud financiera."
      action={<button className="primary-button" onClick={() => setVista('nuevo')}>Nuevo analisis</button>} />
    {workspace.cargandoAnalisis && <div className="info-strip"><p>Analizando tus movimientos...</p></div>}
    {workspace.errorAnalisis && <p className="form-error">{workspace.errorAnalisis} Verifica que el backend y el servicio ML esten encendidos.</p>}
    <div className="tabs">
      <button className={tabActiva === 'resumen' ? 'active' : ''} onClick={() => setTabActiva('resumen')}>Resumen</button>
      <button className={tabActiva === 'categorias' ? 'active' : ''} onClick={() => setTabActiva('categorias')}>Gastos por categoria</button>
      <button className={tabActiva === 'indicadores' ? 'active' : ''} onClick={() => setTabActiva('indicadores')}>Indicadores</button>
      <button className={tabActiva === 'detalles' ? 'active' : ''} onClick={() => setTabActiva('detalles')}>Como se obtuvo</button>
    </div>
    {tabActiva === 'resumen' && <AnalysisSummary workspace={workspace} rows={rows} total={total} />}
    {tabActiva === 'categorias' && <CategoryExpenses rows={rows} total={total} />}
    {tabActiva === 'indicadores' && <IndicatorsView workspace={workspace} />}
    {tabActiva === 'detalles' && <AnalysisDetails workspace={workspace} />}
    <div className="info-strip">
      <p>Este analisis considera {workspace.transacciones.length} transacciones y tus datos financieros actuales.</p>
      <button className="outline-button" type="button" onClick={() => window.print()}><DownloadSimple size={18} /> Imprimir o guardar PDF</button>
    </div>
  </section>;
}

function AnalysisSummary({ workspace, rows, total }: { workspace: PageProps['workspace']; rows: [string, number][]; total: number }) {
  return <div className="two-column-grid">
    <Card title="Perfil financiero">
      <ProfileBanner perfil={workspace.analisis.perfilFinanciero} probabilidad={workspace.analisis.probabilidad} />
      <div className="action-checklist">
        {workspace.analisis.razonesPerfil.map((razon) => <p key={razon}><CheckCircle size={18} weight="fill" /> {razon}</p>)}
      </div>
    </Card>
    <Card title="Indicadores clave"><IndicatorList workspace={workspace} /></Card>
    <Card title="Resumen de gastos"><CategoryBars rows={rows} total={total} /></Card>
    <Card title="Acciones recomendadas">
      <div className="action-checklist">
        {workspace.analisis.recomendaciones.map((item) => <p key={item.id}><CheckCircle size={18} weight="fill" /> {item.descripcion}</p>)}
        {!workspace.analisis.recomendaciones.length && <p>Tus indicadores no requieren acciones urgentes.</p>}
      </div>
    </Card>
  </div>;
}

function CategoryExpenses({ rows, total }: { rows: [string, number][]; total: number }) {
  return <div className="analysis-wide-grid">
    <Card title="Ranking de gasto por categoria" className="span-2">
      <table className="data-table roomy">
        <thead><tr><th>Categoria</th><th>Gasto</th><th>Participacion</th><th>Estado</th></tr></thead>
        <tbody>{rows.map(([categoria, value]) => {
          const percent = total ? (value / total) * 100 : 0;
          return <tr key={categoria}><td>{etiquetasCategoria[categoria as keyof typeof etiquetasCategoria]}</td>
            <td>{formatCurrency(value)}</td><td>{formatPercent(percent)}</td>
            <td>{percent > 30 ? 'Revisar limite' : percent > 15 ? 'Monitorear' : 'Controlado'}</td></tr>;
        })}</tbody>
      </table>
    </Card>
    <Card title="Concentracion de gastos"><CategoryBars rows={rows} total={total} /></Card>
  </div>;
}

function IndicatorsView({ workspace }: { workspace: PageProps['workspace'] }) {
  const indicators = [
    { label: 'Tasa de ahorro', value: formatPercent(workspace.analisis.tasaAhorro), status: workspace.analisis.tasaAhorro >= 10 ? 'Bueno' : 'Bajo' },
    { label: 'Gasto mensual / ingreso', value: formatPercent(workspace.analisis.ratioGastoIngreso), status: workspace.analisis.ratioGastoIngreso <= 70 ? 'Controlado' : 'Alto' },
    { label: 'Nivel de endeudamiento', value: formatPercent(workspace.analisis.nivelEndeudamiento), status: workspace.analisis.nivelEndeudamiento <= 30 ? 'Saludable' : 'Riesgo' },
    { label: 'Gastos de vivienda', value: formatCurrency(workspace.analisis.gastosRecurrentes), status: 'Monitorear' }
  ];
  return <div className="analysis-wide-grid">
    {indicators.map((indicator) => <article className="indicator-card" key={indicator.label}>
      <small>{indicator.label}</small><strong>{indicator.value}</strong><span>{indicator.status}</span>
    </article>)}
    <Card title="Lectura de indicadores" className="span-2"><div className="action-checklist">
      <p><CheckCircle size={20} weight="fill" /> La tasa de ahorro mide cuanto ingreso queda reservado para objetivos o emergencias.</p>
      <p><WarningCircle size={20} weight="fill" /> El ratio gasto / ingreso entra en zona de alerta cuando se acerca al 80%.</p>
      <p><CheckCircle size={20} weight="fill" /> Un endeudamiento menor al 36% deja mayor margen para planificar.</p>
    </div></Card>
  </div>;
}

function AnalysisDetails({ workspace }: { workspace: PageProps['workspace'] }) {
  return <div className="two-column-grid">
    <Card title="Datos considerados"><div className="indicator-list">
      <p><span>Transacciones procesadas</span><strong>{workspace.transacciones.length}</strong></p>
      <p><span>Ingreso mensual</span><strong>{formatCurrency(workspace.analisis.ingresoMensual)}</strong></p>
      <p><span>Gastos analizados</span><strong>{formatCurrency(workspace.analisis.gastoTotalMes)}</strong></p>
      <p><span>Ahorro registrado</span><strong>{formatCurrency(workspace.analisis.ahorroTotal)}</strong></p>
    </div></Card>
    <Card title="Explicacion del resultado"><div className="action-checklist">
      <p><CheckCircle size={20} weight="fill" /> Cada gasto se clasifica automaticamente a partir de su descripcion.</p>
      <p><CheckCircle size={20} weight="fill" /> Se comparan gastos, ingreso, ahorro y deuda para evaluar tu perfil.</p>
      <p><CheckCircle size={20} weight="fill" /> Las sugerencias priorizan los indicadores con mayor desviacion.</p>
    </div></Card>
  </div>;
}

function IndicatorList({ workspace }: { workspace: PageProps['workspace'] }) {
  return <div className="indicator-list">
    <p><span>Tasa de ahorro</span><strong className="positive">{formatPercent(workspace.analisis.tasaAhorro)}</strong></p>
    <p><span>Gasto mensual / ingreso</span><strong className="warning">{formatPercent(workspace.analisis.ratioGastoIngreso)}</strong></p>
    <p><span>Nivel de endeudamiento</span><strong className="positive">{formatPercent(workspace.analisis.nivelEndeudamiento)}</strong></p>
    <p><span>Gastos de vivienda</span><strong>{formatCurrency(workspace.analisis.gastosRecurrentes)}</strong></p>
  </div>;
}

function CategoryBars({ rows, total }: { rows: [string, number][]; total: number }) {
  return <div className="category-bars">{rows.map(([categoria, value]) => <div key={categoria}>
    <p><span>{etiquetasCategoria[categoria as keyof typeof etiquetasCategoria]}</span><strong>{formatCurrency(value)}</strong></p>
    <div><span style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div>
  </div>)}</div>;
}

function NewAnalysisView({ workspace, onBack }: { workspace: PageProps['workspace']; onBack: () => void }) {
  const [ingreso, setIngreso] = useState(String(workspace.ingresoMensual));
  const [deuda, setDeuda] = useState(String(workspace.nivelEndeudamiento));
  const [frecuencia, setFrecuencia] = useState<'Alta' | 'Media' | 'Baja'>(workspace.frecuenciaAhorro);
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const ingresoMensual = Number(ingreso);
    const nivelEndeudamiento = Number(deuda);
    if (ingresoMensual <= 0 || nivelEndeudamiento < 0 || nivelEndeudamiento > 100) {
      setError('Revisa el ingreso y usa un endeudamiento entre 0% y 100%.');
      return;
    }
    workspace.generarAnalisis({ ingresoMensual, nivelEndeudamiento, frecuenciaAhorro: frecuencia });
    onBack();
  }

  return <section className="page-stack">
    <PageHeader title="Nuevo analisis" subtitle="Actualiza tus datos para recalcular tu salud financiera."
      action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>} />
    <form className="subview-card form-panel" onSubmit={submit}>
      <label>Ingreso mensual<input value={ingreso} onChange={(event) => setIngreso(event.target.value)} type="number" min="0.01" step="0.01" /></label>
      <label>Nivel de endeudamiento (%)<input value={deuda} onChange={(event) => setDeuda(event.target.value)} type="number" min="0" max="100" /></label>
      <label>Frecuencia de ahorro<select value={frecuencia} onChange={(event) => setFrecuencia(event.target.value as typeof frecuencia)}>
        <option>Baja</option><option>Media</option><option>Alta</option>
      </select></label>
      <div className="success-note"><Sparkle size={20} weight="fill" /> Se analizaran {workspace.transacciones.length} transacciones registradas.</div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" type="submit"><Sparkle size={18} /> Generar analisis</button>
    </form>
  </section>;
}

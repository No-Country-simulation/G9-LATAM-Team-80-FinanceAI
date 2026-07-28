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

  if (vista === 'nuevo') {
    return <NewAnalysisView workspace={workspace} onBack={() => setVista('resumen')} />;
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Analisis financiero"
        subtitle="Resultados detallados de tu salud financiera."
        action={<button className="primary-button" onClick={() => setVista('nuevo')}>Nuevo analisis</button>}
      />
      <div className="tabs">
        <button className={tabActiva === 'resumen' ? 'active' : ''} onClick={() => setTabActiva('resumen')}>Resumen</button>
        <button className={tabActiva === 'categorias' ? 'active' : ''} onClick={() => setTabActiva('categorias')}>Gastos por categoria</button>
        <button className={tabActiva === 'indicadores' ? 'active' : ''} onClick={() => setTabActiva('indicadores')}>Indicadores</button>
        <button className={tabActiva === 'detalles' ? 'active' : ''} onClick={() => setTabActiva('detalles')}>Detalles del analisis</button>
      </div>

      {tabActiva === 'resumen' && <AnalysisSummary workspace={workspace} rows={rows} total={total} />}
      {tabActiva === 'categorias' && <CategoryExpenses rows={rows} total={total} />}
      {tabActiva === 'indicadores' && <IndicatorsView workspace={workspace} />}
      {tabActiva === 'detalles' && <AnalysisDetails workspace={workspace} />}

      <div className="info-strip">
        <p>Este analisis se genero con base en {workspace.transacciones.length} transacciones y la informacion financiera proporcionada.</p>
        <button className="outline-button"><DownloadSimple size={18} /> Descargar informe PDF</button>
      </div>
    </section>
  );
}

function AnalysisSummary({
  workspace,
  rows,
  total
}: {
  workspace: PageProps['workspace'];
  rows: [string, number][];
  total: number;
}) {
  return (
    <div className="two-column-grid">
      <Card title="Perfil financiero">
        <ProfileBanner perfil={workspace.analisis.perfilFinanciero} probabilidad={workspace.analisis.probabilidad} />
        <div className="risk-scale"><span /><span /><span /><i style={{ left: `${workspace.analisis.probabilidad * 100}%` }} /></div>
        <div className="risk-labels"><small>Saludable</small><small>En observacion</small><small>En riesgo</small></div>
      </Card>
      <Card title="Indicadores clave">
        <IndicatorList workspace={workspace} />
      </Card>
      <Card title="Resumen de gastos">
        <CategoryBars rows={rows} total={total} />
      </Card>
      <Card title="Salida JSON">
        <JsonOutput workspace={workspace} />
      </Card>
    </div>
  );
}

function CategoryExpenses({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <div className="analysis-wide-grid">
      <Card title="Ranking de gasto por categoria" className="span-2">
        <table className="data-table roomy">
          <thead>
            <tr><th>Categoria</th><th>Gasto</th><th>Participacion</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {rows.map(([categoria, value]) => {
              const percent = total ? (value / total) * 100 : 0;
              return (
                <tr key={categoria}>
                  <td>{etiquetasCategoria[categoria as keyof typeof etiquetasCategoria]}</td>
                  <td>{formatCurrency(value)}</td>
                  <td>{formatPercent(percent)}</td>
                  <td>{percent > 30 ? 'Revisar limite' : percent > 15 ? 'Monitorear' : 'Controlado'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card title="Concentracion de gastos">
        <CategoryBars rows={rows} total={total} />
      </Card>
    </div>
  );
}

function IndicatorsView({ workspace }: { workspace: PageProps['workspace'] }) {
  const indicators = [
    { label: 'Tasa de ahorro', value: formatPercent(workspace.analisis.tasaAhorro), status: workspace.analisis.tasaAhorro >= 10 ? 'Bueno' : 'Bajo' },
    { label: 'Gasto mensual / ingreso', value: formatPercent(workspace.analisis.ratioGastoIngreso), status: workspace.analisis.ratioGastoIngreso <= 70 ? 'Controlado' : 'Alto' },
    { label: 'Nivel de endeudamiento', value: formatPercent(workspace.analisis.nivelEndeudamiento), status: workspace.analisis.nivelEndeudamiento <= 30 ? 'Saludable' : 'Riesgo' },
    { label: 'Gastos recurrentes', value: formatCurrency(workspace.analisis.gastosRecurrentes), status: 'Auditar' }
  ];

  return (
    <div className="analysis-wide-grid">
      {indicators.map((indicator) => (
        <article className="indicator-card" key={indicator.label}>
          <small>{indicator.label}</small>
          <strong>{indicator.value}</strong>
          <span>{indicator.status}</span>
        </article>
      ))}
      <Card title="Lectura de indicadores" className="span-2">
        <div className="action-checklist">
          <p><CheckCircle size={20} weight="fill" /> La tasa de ahorro mide cuanto ingreso queda reservado para objetivos o emergencia.</p>
          <p><WarningCircle size={20} weight="fill" /> El ratio gasto / ingreso se acerca a zona de alerta cuando supera el 70%.</p>
          <p><CheckCircle size={20} weight="fill" /> Endeudamiento bajo 30% permite mayor margen para planificacion.</p>
        </div>
      </Card>
    </div>
  );
}

function AnalysisDetails({ workspace }: { workspace: PageProps['workspace'] }) {
  return (
    <div className="two-column-grid">
      <Card title="Criterios del analisis">
        <div className="indicator-list">
          <p><span>Transacciones procesadas</span><strong>{workspace.transacciones.length}</strong></p>
          <p><span>Modelo esperado</span><strong>Clasificador supervisado</strong></p>
          <p><span>Entrada backend</span><strong>JSON financiero</strong></p>
          <p><span>Persistencia OCI</span><strong>Object Storage o Compute</strong></p>
        </div>
      </Card>
      <Card title="Explicacion del resultado">
        <div className="action-checklist">
          <p><CheckCircle size={20} weight="fill" /> Se agrupan gastos por categoria para identificar concentracion.</p>
          <p><CheckCircle size={20} weight="fill" /> Se cruzan ahorro, deuda y gasto mensual para estimar el perfil.</p>
          <p><CheckCircle size={20} weight="fill" /> Las recomendaciones salen de los indicadores con mayor desviacion.</p>
        </div>
      </Card>
      <Card title="Contrato tecnico" className="span-2">
        <JsonOutput workspace={workspace} />
      </Card>
    </div>
  );
}

function IndicatorList({ workspace }: { workspace: PageProps['workspace'] }) {
  return (
    <div className="indicator-list">
      <p><span>Tasa de ahorro</span><strong className="positive">{formatPercent(workspace.analisis.tasaAhorro)}</strong></p>
      <p><span>Gasto mensual / ingreso</span><strong className="warning">{formatPercent(workspace.analisis.ratioGastoIngreso)}</strong></p>
      <p><span>Nivel de endeudamiento</span><strong className="positive">{formatPercent(workspace.analisis.nivelEndeudamiento)}</strong></p>
      <p><span>Gastos recurrentes</span><strong>{formatCurrency(workspace.analisis.gastosRecurrentes)}</strong></p>
    </div>
  );
}

function CategoryBars({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <div className="category-bars">
      {rows.map(([categoria, value]) => (
        <div key={categoria}>
          <p><span>{etiquetasCategoria[categoria as keyof typeof etiquetasCategoria]}</span><strong>{formatCurrency(value)}</strong></p>
          <div><span style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function JsonOutput({ workspace }: { workspace: PageProps['workspace'] }) {
  return (
    <pre className="json-preview">{JSON.stringify({
      perfil_financiero: workspace.analisis.perfilFinanciero,
      probabilidad: workspace.analisis.probabilidad,
      indicadores: {
        tasa_ahorro: workspace.analisis.tasaAhorro,
        gasto_ingreso: workspace.analisis.ratioGastoIngreso,
        endeudamiento: workspace.analisis.nivelEndeudamiento
      },
      resumen_gastos: workspace.analisis.resumenGastos,
      recomendaciones: workspace.analisis.recomendaciones.map((item) => item.titulo)
    }, null, 2)}</pre>
  );
}

function NewAnalysisView({ workspace, onBack }: { workspace: PageProps['workspace']; onBack: () => void }) {
  const requestPayload = {
    ingreso_mensual: 4500,
    nivel_endeudamiento: workspace.analisis.nivelEndeudamiento,
    frecuencia_ahorro: workspace.analisis.tasaAhorro >= 15 ? 'Alta' : workspace.analisis.tasaAhorro >= 10 ? 'Media' : 'Baja',
    transacciones: workspace.transacciones.map((transaccion) => ({
      descripcion: transaccion.descripcion,
      valor: Math.abs(transaccion.monto)
    }))
  };

  return (
    <section className="page-stack">
      <PageHeader
        title="Nuevo analisis"
        subtitle="Prepara la solicitud que se enviara al endpoint POST /analisis-financiero."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <div className="two-column-grid">
        <article className="subview-card form-panel">
          <label>Ingreso mensual<input defaultValue="4500" type="number" /></label>
          <label>Nivel de endeudamiento<input defaultValue={workspace.analisis.nivelEndeudamiento} type="number" /></label>
          <label>Frecuencia de ahorro<select defaultValue="Media"><option>Baja</option><option>Media</option><option>Alta</option></select></label>
          <div className="success-note"><Sparkle size={20} weight="fill" /> {workspace.transacciones.length} transacciones disponibles para analizar.</div>
          <button className="primary-button" type="button">Generar analisis demo</button>
        </article>
        <article className="subview-card">
          <h2>Payload JSON</h2>
          <pre className="json-preview">{JSON.stringify(requestPayload, null, 2)}</pre>
        </article>
      </div>
    </section>
  );
}

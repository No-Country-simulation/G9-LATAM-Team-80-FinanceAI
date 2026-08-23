import { ArrowLeft, ArrowRight, CheckCircle, Target } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Recomendacion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Badge, Card, PageHeader } from '../../tablero/presentacion/DashboardPage';
import { OvenChatWidget } from '../../../compartido/componentes/OvenChatWidget';

type RecommendationTab = 'todas' | 'gastos' | 'ahorro' | 'deudas' | 'ingresos';

export function RecommendationsPage(props: PageProps) {
  // El widget se monta junto a las tres vistas del modulo para que el asistente
  // agentico siga disponible al abrir el detalle o la proyeccion.
  return (
    <>
      <RecommendationsContent {...props} />
      <OvenChatWidget />
    </>
  );
}

function RecommendationsContent({ workspace }: PageProps) {
  const [vista, setVista] = useState<'listado' | 'detalle' | 'proyeccion'>('listado');
  const [tabActiva, setTabActiva] = useState<RecommendationTab>('todas');
  const [recomendacionActiva, setRecomendacionActiva] = useState<Recomendacion | null>(null);
  const recomendacionesFiltradas = tabActiva === 'todas'
    ? workspace.analisis.recomendaciones
    : workspace.analisis.recomendaciones.filter((item) => item.tipo === tabActiva);

  if (vista === 'detalle' && recomendacionActiva) {
    return (
      <RecommendationDetailView
        recomendacion={recomendacionActiva}
        onBack={() => setVista('listado')}
      />
    );
  }

  if (vista === 'proyeccion') {
    return <ProjectionView workspace={workspace} onBack={() => setVista('listado')} />;
  }

  return (
    <section className="page-stack">
      <PageHeader title="Recomendaciones" subtitle="Sugerencias personalizadas para mejorar tu salud financiera." />
      <div className="tabs">
        {([
          ['todas', 'Todas'],
          ['gastos', 'Gastos'],
          ['ahorro', 'Ahorro'],
          ['deudas', 'Deudas'],
          ['ingresos', 'Ingresos']
        ] as const).map(([id, label]) => (
          <button key={id} className={tabActiva === id ? 'active' : ''} onClick={() => setTabActiva(id)}>{label}</button>
        ))}
      </div>
      <div className="recommendations-layout">
        <div className="recommendation-list">
          {recomendacionesFiltradas.map((item) => (
            <article className="recommendation-card" key={item.id}>
              <span><Target size={30} /></span>
              <div>
                <h2>{item.titulo}</h2>
                <p>{item.descripcion}</p>
              </div>
              <Badge tone={item.prioridad === 'Alta' ? 'red' : item.prioridad === 'Media' ? 'orange' : 'green'}>Prioridad: {item.prioridad}</Badge>
              <button
                className="outline-button"
                onClick={() => {
                  setRecomendacionActiva(item);
                  setVista('detalle');
                }}
              >
                Ver detalles
              </button>
            </article>
          ))}
          {recomendacionesFiltradas.length === 0 && (
            <article className="subview-card empty-state">
              <Target size={42} />
              <h2>No hay recomendaciones en esta categoria</h2>
              <p>Cuando el analisis detecte oportunidades, apareceran aqui.</p>
            </article>
          )}
        </div>
        <Card title="Impacto estimado">
          <div className="indicator-list">
            <p><span>Gasto mensual actual</span><strong>{workspace.analisis.gastoTotalMes.toFixed(2)}</strong></p>
            <p><span>Ahorro registrado</span><strong className="positive">{workspace.analisis.ahorroTotal.toFixed(2)}</strong></p>
            <p><span>Perfil actual</span><strong>{workspace.analisis.perfilFinanciero}</strong></p>
          </div>
          <button className="link-button" onClick={() => setVista('proyeccion')}>Ver proyeccion detallada <ArrowRight size={18} /></button>
        </Card>
      </div>
    </section>
  );
}

function RecommendationDetailView({
  recomendacion,
  onBack
}: {
  recomendacion: Recomendacion;
  onBack: () => void;
}) {
  const [marcada, setMarcada] = useState(false);
  return (
    <section className="page-stack">
      <PageHeader
        title="Detalle de recomendacion"
        subtitle="Acciones sugeridas para aplicar esta mejora financiera."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <article className="subview-card recommendation-detail">
        <Badge tone={recomendacion.prioridad === 'Alta' ? 'red' : recomendacion.prioridad === 'Media' ? 'orange' : 'green'}>Prioridad: {recomendacion.prioridad}</Badge>
        <h2>{recomendacion.titulo}</h2>
        <p>{recomendacion.descripcion}</p>
        <div className="detail-grid">
          <article><small>Tipo</small><strong>{recomendacion.tipo}</strong></article>
          <article><small>Prioridad</small><strong>{recomendacion.prioridad}</strong></article>
          <article><small>Plazo sugerido</small><strong>30 dias</strong></article>
        </div>
        <div className="action-checklist">
          <p><CheckCircle size={20} weight="fill" /> Revisar movimientos de los ultimos 30 dias.</p>
          <p><CheckCircle size={20} weight="fill" /> Definir un limite mensual para la categoria afectada.</p>
          <p><CheckCircle size={20} weight="fill" /> Medir el impacto en el siguiente analisis.</p>
        </div>
        <button className="primary-button" onClick={() => setMarcada(true)}>{marcada ? 'Añadida al plan de esta sesion' : 'Marcar como plan de accion'}</button>
      </article>
    </section>
  );
}

function ProjectionView({ workspace, onBack }: { workspace: PageProps['workspace']; onBack: () => void }) {
  const reduccionObjetivo = workspace.analisis.gastoTotalMes * 0.1;
  const ahorroOptimizado = workspace.analisis.ahorroTotal + reduccionObjetivo;
  return (
    <section className="page-stack">
      <PageHeader
        title="Proyeccion detallada"
        subtitle="Estimacion de impacto si aplicas las recomendaciones principales."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <div className="two-column-grid">
        <article className="subview-card">
          <h2>Escenario actual</h2>
          <div className="indicator-list">
            <p><span>Ahorro registrado</span><strong>$ {workspace.analisis.ahorroTotal.toFixed(2)}</strong></p>
            <p><span>Gasto mensual</span><strong>$ {workspace.analisis.gastoTotalMes.toFixed(2)}</strong></p>
            <p><span>Perfil</span><strong>{workspace.analisis.perfilFinanciero}</strong></p>
          </div>
        </article>
        <article className="subview-card">
          <h2>Escenario optimizado</h2>
          <div className="indicator-list">
            <p><span>Ahorro mensual</span><strong className="positive">$ {ahorroOptimizado.toFixed(2)}</strong></p>
            <p><span>Reduccion objetivo (10%)</span><strong className="blue">$ {reduccionObjetivo.toFixed(2)}</strong></p>
            <p><span>Resultado esperado</span><strong className="positive">Mayor margen financiero</strong></p>
          </div>
        </article>
      </div>
      <article className="subview-card">
        <h2>Proyeccion por mes</h2>
        <table className="data-table roomy">
          <thead><tr><th>Mes</th><th>Ahorro proyectado</th><th>Gasto reducido</th><th>Perfil esperado</th></tr></thead>
          <tbody>
            {[1, 2, 3].map((mes) => <tr key={mes}><td>Mes {mes}</td><td>$ {(workspace.analisis.ahorroTotal + reduccionObjetivo * mes).toFixed(2)}</td><td>$ {(reduccionObjetivo * mes).toFixed(2)}</td><td>Mejora progresiva</td></tr>)}
          </tbody>
        </table>
      </article>
    </section>
  );
}

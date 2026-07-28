import { ArrowLeft, ArrowRight, CheckCircle, Target } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Recomendacion } from '../../../compartido/tipos/finanzas';
import type { PageProps } from '../../../compartido/tipos/workspace';
import { Badge, Card, PageHeader } from '../../tablero/presentacion/DashboardPage';

type RecommendationTab = 'todas' | 'gastos' | 'ahorro' | 'deudas' | 'ingresos';

export function RecommendationsPage({ workspace }: PageProps) {
  const [vista, setVista] = useState<'listado' | 'detalle' | 'proyeccion'>('listado');
  const [tabActiva, setTabActiva] = useState<RecommendationTab>('todas');
  const [recomendacionActiva, setRecomendacionActiva] = useState<Recomendacion | null>(null);
  const recomendacionesExtendidas = [
    ...workspace.analisis.recomendaciones,
    {
      id: 'r-5',
      titulo: 'Renegocia deudas de corto plazo',
      descripcion: 'Consolida cuotas pequeñas para reducir interes mensual y mejorar flujo de caja.',
      prioridad: 'Media',
      tipo: 'deudas'
    },
    {
      id: 'r-6',
      titulo: 'Diversifica ingresos variables',
      descripcion: 'Registra fuentes adicionales y compara su estabilidad durante los ultimos tres meses.',
      prioridad: 'Baja',
      tipo: 'ingresos'
    }
  ] satisfies Recomendacion[];
  const recomendacionesFiltradas = tabActiva === 'todas'
    ? recomendacionesExtendidas
    : recomendacionesExtendidas.filter((item) => item.tipo === tabActiva);

  if (vista === 'detalle' && recomendacionActiva) {
    return (
      <RecommendationDetailView
        recomendacion={recomendacionActiva}
        onBack={() => setVista('listado')}
      />
    );
  }

  if (vista === 'proyeccion') {
    return <ProjectionView onBack={() => setVista('listado')} />;
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
            <p><span>Ahorro adicional mensual</span><strong className="positive">$ 450.00</strong></p>
            <p><span>Reduccion de gastos</span><strong className="blue">- $ 380.00</strong></p>
            <p><span>Mejora en tu perfil</span><strong>Alta probabilidad de pasar a Saludable</strong></p>
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
          <article><small>Impacto estimado</small><strong>{recomendacion.tipo === 'ahorro' ? '$ 450.00' : '$ 180.00'}</strong></article>
          <article><small>Plazo sugerido</small><strong>30 dias</strong></article>
        </div>
        <div className="action-checklist">
          <p><CheckCircle size={20} weight="fill" /> Revisar movimientos de los ultimos 30 dias.</p>
          <p><CheckCircle size={20} weight="fill" /> Definir un limite mensual para la categoria afectada.</p>
          <p><CheckCircle size={20} weight="fill" /> Medir el impacto en el siguiente analisis.</p>
        </div>
        <button className="primary-button">Marcar como plan de accion</button>
      </article>
    </section>
  );
}

function ProjectionView({ onBack }: { onBack: () => void }) {
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
            <p><span>Ahorro mensual</span><strong>$ 600.00</strong></p>
            <p><span>Gasto recurrente</span><strong>$ 1,240.00</strong></p>
            <p><span>Perfil</span><strong>En observacion</strong></p>
          </div>
        </article>
        <article className="subview-card">
          <h2>Escenario optimizado</h2>
          <div className="indicator-list">
            <p><span>Ahorro mensual</span><strong className="positive">$ 1,050.00</strong></p>
            <p><span>Reduccion de gastos</span><strong className="blue">$ 380.00</strong></p>
            <p><span>Perfil proyectado</span><strong className="positive">Saludable</strong></p>
          </div>
        </article>
      </div>
      <article className="subview-card">
        <h2>Proyeccion por mes</h2>
        <table className="data-table roomy">
          <thead><tr><th>Mes</th><th>Ahorro proyectado</th><th>Gasto reducido</th><th>Perfil esperado</th></tr></thead>
          <tbody>
            <tr><td>Mes 1</td><td>$ 720.00</td><td>$ 180.00</td><td>En observacion</td></tr>
            <tr><td>Mes 2</td><td>$ 890.00</td><td>$ 290.00</td><td>En observacion</td></tr>
            <tr><td>Mes 3</td><td>$ 1,050.00</td><td>$ 380.00</td><td>Saludable</td></tr>
          </tbody>
        </table>
      </article>
    </section>
  );
}

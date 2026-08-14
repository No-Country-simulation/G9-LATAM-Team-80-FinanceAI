import { CheckCircle, CloudArrowUp, Database, LockKey, WarningCircle } from '@phosphor-icons/react';
import { Card, PageHeader } from '../../tablero/presentacion/DashboardPage';
import type { PageProps } from '../../../compartido/tipos/workspace';

export function SettingsPage({ workspace, navegar }: PageProps) {
  return <section className="page-stack">
    <PageHeader title="Configuracion del sistema" subtitle="Estado de las funciones disponibles en esta instalacion local." />
    <div className="settings-grid">
      <Card title="Persistencia MySQL">
        <div className="settings-list">
          <p><Database size={24} /> Base de datos <strong>financeai</strong></p>
          <p><CheckCircle size={24} /> Transacciones guardadas <strong>{workspace.transacciones.length}</strong></p>
          <p><CheckCircle size={24} /> Analisis guardados <strong>{workspace.historial.length}</strong></p>
          <p><CheckCircle size={24} /> Presupuestos guardados <strong>{workspace.presupuestos.length}</strong></p>
        </div>
      </Card>
      <Card title="Seguridad local">
        <div className="settings-list">
          <p><LockKey size={24} /> Contrasenas <strong>BCrypt</strong></p>
          <p><CheckCircle size={24} /> Acceso a datos <strong>Sesion requerida</strong></p>
          <p><CheckCircle size={24} /> Separacion por usuario <strong>Activa</strong></p>
        </div>
      </Card>
      <Card title="Importacion">
        <div className="settings-list"><p><CloudArrowUp size={24} /> Archivos CSV <strong>Disponible</strong></p></div>
        <button className="primary-button wide" onClick={() => navegar('archivos')}>Ir a importar CSV</button>
      </Card>
      <Card title="Integraciones externas">
        <div className="settings-list">
          <p><WarningCircle size={24} /> Conexion bancaria automatica <strong>No configurada</strong></p>
          <p><WarningCircle size={24} /> Despliegue OCI <strong>Pendiente</strong></p>
          <p><WarningCircle size={24} /> Correo y notificaciones push <strong>No configurados</strong></p>
        </div>
        <p className="muted-copy">Estas funciones requieren credenciales y servicios externos reales. No se muestran datos bancarios ficticios.</p>
      </Card>
    </div>
  </section>;
}

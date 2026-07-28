import {
  ArrowLeft,
  Bank,
  Bell,
  CalendarBlank,
  CheckCircle,
  CloudArrowUp,
  CreditCard,
  CurrencyCircleDollar,
  EnvelopeSimple,
  LockKey,
  ShieldCheck,
  Target,
  User
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Card, PageHeader } from '../../tablero/presentacion/DashboardPage';
import type { PageProps } from '../../../compartido/tipos/workspace';

type SettingsTab = 'perfil' | 'preferencias' | 'objetivos' | 'notificaciones' | 'seguridad';
type ProfileSubview = 'resumen' | 'editar' | 'cuentas' | 'tarjetas' | 'importacion';

export function SettingsPage(_: PageProps) {
  const [tabActiva, setTabActiva] = useState<SettingsTab>('perfil');

  return (
    <section className="page-stack">
      <PageHeader title="Configuracion" subtitle="Administra tu perfil, preferencias y objetivos financieros." />
      <div className="tabs">
        {([
          ['perfil', 'Perfil'],
          ['preferencias', 'Preferencias'],
          ['objetivos', 'Objetivos'],
          ['notificaciones', 'Notificaciones'],
          ['seguridad', 'Seguridad']
        ] as const).map(([id, label]) => (
          <button key={id} className={tabActiva === id ? 'active' : ''} onClick={() => setTabActiva(id)}>{label}</button>
        ))}
      </div>

      {tabActiva === 'perfil' && <ProfileSettings />}
      {tabActiva === 'preferencias' && <PreferencesSettings />}
      {tabActiva === 'objetivos' && <GoalsSettings />}
      {tabActiva === 'notificaciones' && <NotificationsSettings />}
      {tabActiva === 'seguridad' && <SecuritySettings />}
    </section>
  );
}

function ProfileSettings() {
  const [subvista, setSubvista] = useState<ProfileSubview>('resumen');

  if (subvista === 'editar') {
    return <EditProfileView onBack={() => setSubvista('resumen')} />;
  }

  if (subvista === 'cuentas') {
    return <BankAccountsView onBack={() => setSubvista('resumen')} />;
  }

  if (subvista === 'tarjetas') {
    return <CreditCardsView onBack={() => setSubvista('resumen')} />;
  }

  if (subvista === 'importacion') {
    return <ManualImportView onBack={() => setSubvista('resumen')} />;
  }

  return (
    <div className="settings-grid">
      <Card title="Informacion personal">
        <div className="profile-info"><span><User size={30} /></span><p><strong>Juan Diego</strong><small>juan.diego@email.com</small><small>+51 987 654 321</small></p></div>
        <button className="outline-button wide" onClick={() => setSubvista('editar')}>Editar informacion</button>
      </Card>
      <Card title="Datos de cuenta">
        <div className="settings-list">
          <p><EnvelopeSimple size={24} /> Correo verificado <strong>Activo</strong></p>
          <p><CalendarBlank size={24} /> Fecha de registro <strong>01 May 2025</strong></p>
          <p><User size={24} /> Tipo de usuario <strong>Personal</strong></p>
        </div>
      </Card>
      <Card title="Conexiones e integraciones">
        <div className="integration-grid">
          <article><Bank size={32} /><strong>Cuentas bancarias</strong><p>Conecta tus cuentas para importar movimientos.</p><button onClick={() => setSubvista('cuentas')}>Administrar</button></article>
          <article><CreditCard size={32} /><strong>Tarjetas de credito</strong><p>Importa consumos y controla gastos con tarjeta.</p><button onClick={() => setSubvista('tarjetas')}>Administrar</button></article>
          <article><CloudArrowUp size={32} /><strong>Importacion manual</strong><p>Sube archivos CSV con tus transacciones.</p><button onClick={() => setSubvista('importacion')}>Importar</button></article>
        </div>
      </Card>
    </div>
  );
}

function EditProfileView({ onBack }: { onBack: () => void }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Editar informacion"
        subtitle="Actualiza los datos personales asociados a tu cuenta."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <form className="subview-card form-panel">
        <label>Nombre completo<input defaultValue="Juan Diego" /></label>
        <label>Correo electronico<input defaultValue="juan.diego@email.com" type="email" /></label>
        <label>Telefono<input defaultValue="+51 987 654 321" /></label>
        <label>Tipo de usuario<select defaultValue="personal"><option value="personal">Personal</option><option value="familiar">Familiar</option><option value="emprendedor">Emprendedor</option></select></label>
        <label>Fecha de registro<input defaultValue="2025-05-01" type="date" /></label>
        <label>Documento opcional<input placeholder="DNI o documento interno" /></label>
        <div className="form-actions">
          <button className="outline-button" type="button" onClick={onBack}>Cancelar</button>
          <button className="primary-button" type="button" onClick={onBack}>Guardar cambios</button>
        </div>
      </form>
    </section>
  );
}

function BankAccountsView({ onBack }: { onBack: () => void }) {
  const accounts = [
    ['BCP Cuenta Sueldo', 'Ahorros PEN', '**** 4821', 'Conectado'],
    ['Interbank Ahorro Meta', 'Ahorros PEN', '**** 1180', 'Conectado'],
    ['Scotiabank Gastos', 'Corriente PEN', '**** 7392', 'Pendiente']
  ];

  return (
    <section className="page-stack">
      <PageHeader
        title="Administrar cuentas bancarias"
        subtitle="Controla las cuentas conectadas para importar movimientos financieros."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <div className="two-column-grid">
        <article className="subview-card">
          <h2>Cuentas conectadas</h2>
          <table className="data-table roomy">
            <thead><tr><th>Banco</th><th>Tipo</th><th>Cuenta</th><th>Estado</th></tr></thead>
            <tbody>
              {accounts.map((account) => <tr key={account[2]}><td>{account[0]}</td><td>{account[1]}</td><td>{account[2]}</td><td>{account[3]}</td></tr>)}
            </tbody>
          </table>
        </article>
        <form className="subview-card form-panel single-column">
          <h2>Nueva conexion bancaria</h2>
          <label>Entidad financiera<select defaultValue="BCP"><option>BCP</option><option>Interbank</option><option>BBVA</option><option>Scotiabank</option></select></label>
          <label>Tipo de cuenta<select defaultValue="Ahorros PEN"><option>Ahorros PEN</option><option>Corriente PEN</option><option>Ahorros USD</option></select></label>
          <label>Alias<input placeholder="Ej. Cuenta principal" /></label>
          <button className="primary-button" type="button">Conectar cuenta</button>
        </form>
      </div>
    </section>
  );
}

function CreditCardsView({ onBack }: { onBack: () => void }) {
  const cards = [
    ['Visa Clasica', 'BCP', '**** 9142', '$ 1,240.00'],
    ['Mastercard Black', 'Interbank', '**** 5520', '$ 780.00']
  ];

  return (
    <section className="page-stack">
      <PageHeader
        title="Administrar tarjetas de credito"
        subtitle="Registra tarjetas para controlar consumos, cuotas y endeudamiento."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <div className="two-column-grid">
        <article className="subview-card">
          <h2>Tarjetas registradas</h2>
          <table className="data-table roomy">
            <thead><tr><th>Tarjeta</th><th>Banco</th><th>Numero</th><th>Consumo actual</th></tr></thead>
            <tbody>
              {cards.map((card) => <tr key={card[2]}><td>{card[0]}</td><td>{card[1]}</td><td>{card[2]}</td><td>{card[3]}</td></tr>)}
            </tbody>
          </table>
        </article>
        <form className="subview-card form-panel single-column">
          <h2>Nueva tarjeta</h2>
          <label>Banco<select defaultValue="BCP"><option>BCP</option><option>Interbank</option><option>BBVA</option><option>Scotiabank</option></select></label>
          <label>Tipo de tarjeta<select defaultValue="Visa"><option>Visa</option><option>Mastercard</option><option>American Express</option></select></label>
          <label>Ultimos 4 digitos<input maxLength={4} placeholder="1234" /></label>
          <label>Linea de credito<input type="number" placeholder="5000" /></label>
          <button className="primary-button" type="button">Guardar tarjeta</button>
        </form>
      </div>
    </section>
  );
}

function ManualImportView({ onBack }: { onBack: () => void }) {
  return (
    <section className="page-stack">
      <PageHeader
        title="Importacion manual"
        subtitle="Configura una carga CSV desde tus bancos o billeteras digitales."
        action={<button className="outline-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>}
      />
      <div className="two-column-grid">
        <article className="subview-card upload-subview">
          <CloudArrowUp size={58} />
          <h2>Archivo de transacciones</h2>
          <p>Formato esperado: fecha, descripcion, monto, tipo y categoria opcional.</p>
          <button className="primary-button" type="button">Seleccionar archivo CSV</button>
        </article>
        <article className="subview-card">
          <h2>Mapeo de columnas</h2>
          <div className="settings-list">
            <p>Fecha <strong>fecha_operacion</strong></p>
            <p>Descripcion <strong>detalle</strong></p>
            <p>Monto <strong>importe</strong></p>
            <p>Tipo <strong>movimiento</strong></p>
          </div>
          <div className="success-note"><CheckCircle size={20} weight="fill" /> Plantilla compatible con la API de analisis.</div>
        </article>
      </div>
    </section>
  );
}

function PreferencesSettings() {
  return (
    <div className="two-column-grid">
      <Card title="Preferencias financieras">
        <div className="settings-list">
          <p><CurrencyCircleDollar size={24} /> Moneda <strong>USD - Dolar estadounidense</strong></p>
          <p><CalendarBlank size={24} /> Inicio de semana <strong>Lunes</strong></p>
          <p><Bank size={24} /> Categorias personalizadas <strong>Administrar</strong></p>
          <p><CreditCard size={24} /> Metodo principal <strong>Tarjeta debito</strong></p>
        </div>
      </Card>
      <Card title="Formato de datos">
        <div className="form-panel single-column">
          <label>Formato de numeros<select defaultValue="1,234.56"><option>1,234.56</option><option>1.234,56</option></select></label>
          <label>Idioma<select defaultValue="es"><option value="es">Espanol</option><option value="pt">Portugues</option></select></label>
          <label>Zona horaria<select defaultValue="America/Lima"><option>America/Lima</option><option>America/Bogota</option></select></label>
        </div>
      </Card>
    </div>
  );
}

function GoalsSettings() {
  const goals = [
    ['Fondo de emergencia', '$ 1,350.00 / $ 5,000.00', '27%'],
    ['Viaje a Europa', '$ 2,450.00 / $ 8,000.00', '31%'],
    ['Educacion personal', '$ 650.00 / $ 2,000.00', '33%']
  ];

  return (
    <div className="two-column-grid">
      <Card title="Objetivos financieros activos">
        <div className="goal-list">
          {goals.map(([title, amount, percent]) => (
            <article key={title}>
              <span><Target size={24} /></span>
              <div><strong>{title}</strong><p>{amount}</p><div><i style={{ width: percent }} /></div></div>
              <small>{percent}</small>
            </article>
          ))}
        </div>
      </Card>
      <Card title="Nuevo objetivo">
        <div className="form-panel single-column">
          <label>Nombre<input placeholder="Ej. Fondo de emergencia" /></label>
          <label>Monto objetivo<input type="number" placeholder="5000" /></label>
          <label>Fecha limite<input type="date" /></label>
          <button className="primary-button">Crear objetivo</button>
        </div>
      </Card>
    </div>
  );
}

function NotificationsSettings() {
  const notifications = [
    ['Alertas de gasto elevado', 'Notificar cuando una categoria supere el 80% del presupuesto.'],
    ['Resumen semanal', 'Enviar resumen de salud financiera cada lunes.'],
    ['Recomendaciones nuevas', 'Avisar cuando el analisis detecte una nueva oportunidad.'],
    ['Recordatorio de ahorro', 'Recordar transferencia mensual hacia objetivos.']
  ];

  return (
    <div className="two-column-grid">
      <Card title="Preferencias de notificacion">
        <div className="toggle-list">
          {notifications.map(([title, description]) => (
            <label key={title}>
              <span><Bell size={22} /><strong>{title}</strong><small>{description}</small></span>
              <input type="checkbox" defaultChecked />
            </label>
          ))}
        </div>
      </Card>
      <Card title="Canales">
        <div className="settings-list">
          <p><EnvelopeSimple size={24} /> Correo electronico <strong>Activo</strong></p>
          <p><Bell size={24} /> Notificaciones web <strong>Activo</strong></p>
          <p><CheckCircle size={24} /> Reporte mensual <strong>Activo</strong></p>
        </div>
      </Card>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="two-column-grid">
      <Card title="Seguridad de cuenta">
        <div className="settings-list">
          <p><ShieldCheck size={24} /> Autenticacion en dos pasos <strong>Disponible</strong></p>
          <p><LockKey size={24} /> Ultimo cambio de clave <strong>15 May 2025</strong></p>
          <p><CheckCircle size={24} /> Sesiones activas <strong>2 dispositivos</strong></p>
        </div>
      </Card>
      <Card title="Cambiar contrasena">
        <div className="form-panel single-column">
          <label>Contrasena actual<input type="password" /></label>
          <label>Nueva contrasena<input type="password" /></label>
          <label>Confirmar contrasena<input type="password" /></label>
          <button className="primary-button">Actualizar contrasena</button>
        </div>
      </Card>
      <article className="info-strip settings-security-strip">
        <p>Tu informacion esta protegida con buenas practicas de cifrado y controles de acceso.</p>
        <button className="outline-button">Ver politica de privacidad</button>
      </article>
    </div>
  );
}

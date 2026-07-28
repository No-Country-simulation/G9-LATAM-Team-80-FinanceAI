import { Bell, CaretDown, ChartBar, ShieldCheck, X } from '@phosphor-icons/react';
import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { RutaAplicacion, RutaId } from '../../compartido/tipos/rutas';

type DashboardLayoutProps = PropsWithChildren<{
  rutas: RutaAplicacion[];
  rutaActiva: RutaId;
  onNavigate: (ruta: RutaId) => void;
  usuario: {
    nombre: string;
    iniciales: string;
    rol: string;
  };
}>;

export function DashboardLayout({
  rutas,
  rutaActiva,
  onNavigate,
  usuario,
  children
}: DashboardLayoutProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  function navegar(ruta: RutaId) {
    onNavigate(ruta);
    setMenuAbierto(false);
  }

  return (
    <div className="layout">
      {menuAbierto && (
        <button
          className="layout-overlay"
          aria-label="Cerrar menu"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside className={`sidebar ${menuAbierto ? 'is-open' : ''}`}>
        <div className="sidebar-head">
          <button className="brand-mark" onClick={() => navegar('tablero')}>
            <span><ChartBar size={28} weight="fill" /></span>
            <strong>Salud Financiera</strong>
          </button>
          <button className="sidebar-close" aria-label="Cerrar menu" onClick={() => setMenuAbierto(false)}>
            <X size={18} />
          </button>
        </div>

        <button className="brand-mark brand-mark-desktop" onClick={() => navegar('tablero')}>
          <span><ChartBar size={28} weight="fill" /></span>
          <strong>Salud Financiera</strong>
        </button>

        <nav className="side-nav">
          {rutas.map((ruta) => {
            const Icon = ruta.icono;
            return (
              <button
                key={ruta.id}
                className={rutaActiva === ruta.id ? 'active' : ''}
                onClick={() => navegar(ruta.id)}
              >
                <Icon size={22} />
                <span>{ruta.etiqueta}</span>
              </button>
            );
          })}
        </nav>

        <article className="side-tip">
          <span><ShieldCheck size={22} weight="fill" /></span>
          <strong>Consejo del dia</strong>
          <p>Intenta ahorrar al menos el 10% de tus ingresos mensuales.</p>
          <img src="/imagenes-de-guia/image1.png" alt="" />
        </article>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-menu-button" aria-label="Abrir menu" onClick={() => setMenuAbierto(true)}>
              <span />
              <span />
              <span />
            </button>
            <div>
              <small>Panel financiero</small>
              <strong>Salud Financiera</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="date-pill">01 May 2025 - 31 May 2025 <CaretDown size={16} /></button>
            <button className="notification-button" aria-label="Notificaciones">
              <Bell size={21} />
              <span>3</span>
            </button>
            <button className="user-menu">
              <span>{usuario.iniciales}</span>
              <div>
                <strong>{usuario.nombre}</strong>
                <small>{usuario.rol}</small>
              </div>
              <CaretDown size={16} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

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
  onLogout: () => void;
  /** Mes que esta mirando el analisis, en formato YYYY-MM. */
  mesAnalizado: string | null;
  /** Meses con movimientos, del mas reciente al mas viejo. */
  mesesDisponibles: string[];
  onSeleccionarMes: (mes: string) => void;
}>;

/**
 * La pastilla del encabezado mostraba siempre el mes calendario actual, aunque los
 * numeros del tablero fueran de todo el historial. Ahora muestra el mes que realmente
 * se esta analizando, que es el mas reciente con movimientos.
 */
function etiquetaDeMes(mes: string | null) {
  if (mes === null) return 'Sin movimientos';
  const [anio, numeroMes] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })
    .format(new Date(anio, numeroMes - 1, 1));
}

export function DashboardLayout({
  rutas,
  rutaActiva,
  onNavigate,
  usuario,
  onLogout,
  mesAnalizado,
  mesesDisponibles,
  onSeleccionarMes,
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
            {mesesDisponibles.length > 1 ? (
              <select
                className="date-pill"
                aria-label="Mes que se esta analizando"
                value={mesAnalizado ?? ''}
                onChange={(evento) => onSeleccionarMes(evento.target.value)}
              >
                {mesesDisponibles.map((mes) => (
                  <option key={mes} value={mes}>{etiquetaDeMes(mes)}</option>
                ))}
              </select>
            ) : (
              // Con un solo mes cargado un desplegable no aporta nada y se ve raro.
              <span className="date-pill">{etiquetaDeMes(mesAnalizado)}</span>
            )}
            <button className="notification-button" aria-label="Notificaciones">
              <Bell size={21} />
              <span>3</span>
            </button>
            <button className="user-menu" onClick={onLogout} title="Cerrar sesion">
              <span>{usuario.iniciales}</span>
              <div>
                <strong>{usuario.nombre}</strong>
                <small>{usuario.rol}</small>
              </div>
              <small>Salir</small>
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

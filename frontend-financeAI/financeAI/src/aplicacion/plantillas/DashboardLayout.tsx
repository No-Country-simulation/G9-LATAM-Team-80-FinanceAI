import { Bell, CaretDown, ChartBar, Check, Gear, List, SignOut, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { AgenteFinanceAI } from '../../compartido/componentes/AgenteFinanceAI';
import type { RutaAplicacion, RutaId } from '../../compartido/tipos/rutas';
import './layout.css';

type DashboardLayoutProps = PropsWithChildren<{
  rutas: RutaAplicacion[];
  rutaActiva: RutaId;
  onNavigate: (ruta: RutaId) => void;
  usuario: {
    nombre: string;
    iniciales: string;
    rol: string;
    /** Ya venia en la sesion; se muestra en el menu si existe. */
    email?: string;
  };
  onLogout: () => void;
  /** Periodo global seleccionado, en formato YYYY-MM. Lo elige la persona. */
  mesAnalizado: string | null;
  /** Meses del anio elegido con movimientos, del mas reciente al mas viejo. */
  onSeleccionarMes: (mes: string) => void;
  /** Anio que se esta analizando, en formato YYYY. */
  anioAnalizado: string | null;
  /** Rango de anios navegable. Se calcula desde el reloj, no desde los datos. */
  aniosDisponibles: string[];
  onSeleccionarAnio: (anio: string) => void;
}>;

/** Mes y anio del selector, en texto. Null si todavia no hay movimientos. */
function etiquetaDePeriodo(mes: string | null) {
  if (mes === null) return null;
  const [anio, numero] = mes.split('-').map(Number);
  const nombre = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(anio, numero - 1, 1));
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

const GRUPOS = [
  { id: 'general' as const, etiqueta: 'General' }
];

export function DashboardLayout({
  rutas,
  rutaActiva,
  onNavigate,
  usuario,
  onLogout,
  mesAnalizado,
  onSeleccionarMes,
  anioAnalizado,
  aniosDisponibles,
  onSeleccionarAnio,
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

      <aside className={`fa-nav ${menuAbierto ? 'abierto' : ''}`}>
        <div className="fa-nav-cabecera">
          <button className="fa-marca" onClick={() => navegar('tablero')}>
            <ChartBar size={26} weight="fill" />
            <strong>FinanceAI</strong>
          </button>
          <button className="fa-nav-cerrar" aria-label="Cerrar menu" onClick={() => setMenuAbierto(false)}>
            <X size={17} />
          </button>
        </div>

        <nav className="fa-nav-lista">
          {GRUPOS.map((grupo) => {
            const rutasDelGrupo = rutas.filter((ruta) => ruta.grupo === grupo.id);
            if (rutasDelGrupo.length === 0) return null;
            return (
              <div key={grupo.id} className="fa-nav-grupo">
                <p className="fa-nav-grupo-titulo">{grupo.etiqueta}</p>
                {rutasDelGrupo.map((ruta) => {
                  const Icono = ruta.icono;
                  const activa = rutaActiva === ruta.id;
                  return (
                    <button
                      key={ruta.id}
                      className={activa ? 'activa' : ''}
                      /* El estado activo no depende solo del color: se anuncia al lector. */
                      aria-current={activa ? 'page' : undefined}
                      onClick={() => navegar(ruta.id)}
                    >
                      <Icono size={19} />
                      <span>{ruta.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="main-area">
        <header className="fa-header">
          <div className="fa-header-contexto">
            <button className="fa-header-menu" aria-label="Abrir menu" onClick={() => setMenuAbierto(true)}>
              <List size={20} />
            </button>
            {/* El titular de cada pagina vive en su contenido. Aca solo va la ubicacion,
                y sin repetir la marca: ya esta en el sidebar. */}
            <span>Panel financiero</span>
          </div>

          <div className="fa-header-controles">
            <SelectorPeriodo
              mesAnalizado={mesAnalizado}
              anioAnalizado={anioAnalizado}
              aniosDisponibles={aniosDisponibles}
              onSeleccionarMes={onSeleccionarMes}
              onSeleccionarAnio={onSeleccionarAnio}
            />

            {/* Sin badge: no existe una fuente real de notificaciones sin leer. */}
            <button className="fa-control fa-icono-boton" aria-label="Notificaciones">
              <Bell size={19} />
            </button>

            <span className="fa-divisor" aria-hidden="true" />

            <MenuUsuario usuario={usuario} onNavegarConfiguracion={() => navegar('configuracion')} onLogout={onLogout} />
          </div>
        </header>
        {children}
      </div>

      {/* Capa global: el agente acompaña a todas las vistas, no vive dentro de una. */}
      <AgenteFinanceAI
        pantalla={rutas.find((ruta) => ruta.id === rutaActiva)?.etiqueta ?? 'FinanceAI'}
        periodo={etiquetaDePeriodo(mesAnalizado)}
      />
    </div>
  );
}


/**
 * Menu del usuario. Reemplaza al bloque que mostraba nombre, rol y "Salir" siempre
 * visibles: en el header queda avatar y nombre, y el resto se despliega al pedirlo.
 *
 * Se cierra al hacer clic fuera y con Escape. No se agrego ninguna accion que no
 * exista ya: Configuracion navega a la pantalla real y Cerrar sesion reutiliza el
 * mismo logout de antes.
 */
function MenuUsuario({ usuario, onNavegarConfiguracion, onLogout }: {
  usuario: DashboardLayoutProps['usuario'];
  onNavegarConfiguracion: () => void;
  onLogout: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    }
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [abierto]);

  return (
    <div className="fa-usuario" ref={contenedor}>
      <button
        className="fa-usuario-boton"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((visible) => !visible)}
      >
        <span className="fa-avatar">{usuario.iniciales}</span>
        <span className="fa-usuario-nombre">{usuario.nombre}</span>
        <CaretDown size={14} />
      </button>

      {abierto && (
        <div className="fa-menu" role="menu">
          <div className="fa-menu-cabecera">
            <strong>{usuario.nombre}</strong>
            {usuario.email && <small>{usuario.email}</small>}
          </div>
          <button role="menuitem" onClick={() => { setAbierto(false); onNavegarConfiguracion(); }}>
            <Gear size={17} /> Configuracion
          </button>
          <button role="menuitem" onClick={() => { setAbierto(false); onLogout(); }}>
            <SignOut size={17} /> Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );
}


/** Los 12 meses en el idioma de la app, resueltos una sola vez. */
const MESES = Array.from({ length: 12 }, (_, indice) => {
  const fecha = new Date(2000, indice, 1);
  const largo = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(fecha);
  const corto = new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(fecha).replace('.', '');
  const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
  return { numero: String(indice + 1).padStart(2, '0'), largo: capitalizar(largo), corto: capitalizar(corto) };
});

/** Cierra el desplegable al hacer clic fuera y con Escape. */
function useCierreExterno(activo: boolean, cerrar: () => void) {
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activo) return;
    function alClicFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) cerrar();
    }
    function alPulsarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') cerrar();
    }
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [activo, cerrar]);
  return contenedor;
}

/**
 * Selector de periodo: un solo control partido en mes y anio.
 *
 * Reemplaza al date picker anterior, que sugeria elegir una fecha exacta cuando la app
 * razona por mes. No introduce estado propio: sigue leyendo mesAnalizado y llamando a
 * las mismas dos funciones del workspace.
 *
 * Los doce meses se pueden elegir siempre. Antes los que no tenian movimientos iban
 * deshabilitados, y eso hacia imposible lo unico para lo que sirve un presupuesto:
 * planificar un mes que todavia no ha ocurrido. Que haya datos decide lo que enseña cada
 * pantalla, no a donde se puede navegar.
 */
function SelectorPeriodo({ mesAnalizado, anioAnalizado, aniosDisponibles, onSeleccionarMes, onSeleccionarAnio }: {
  mesAnalizado: string | null;
  anioAnalizado: string | null;
  aniosDisponibles: string[];
  onSeleccionarMes: (mes: string) => void;
  onSeleccionarAnio: (anio: string) => void;
}) {
  const [abierto, setAbierto] = useState<'mes' | 'anio' | null>(null);
  const contenedor = useCierreExterno(abierto !== null, useCallback(() => setAbierto(null), []));

  if (mesAnalizado === null || anioAnalizado === null) return null;

  const numeroActual = mesAnalizado.slice(5, 7);
  const mesActual = MESES.find((mes) => mes.numero === numeroActual) ?? MESES[0];

  return (
    <div className="fa-periodo" ref={contenedor}>
      <button
        type="button"
        className="fa-periodo-zona"
        aria-haspopup="listbox"
        aria-expanded={abierto === 'mes'}
        onClick={() => setAbierto((actual) => (actual === 'mes' ? null : 'mes'))}
      >
        <span className="fa-periodo-largo">{mesActual.largo}</span>
        <span className="fa-periodo-corto">{mesActual.corto}</span>
        <CaretDown size={14} />
      </button>

      <span className="fa-periodo-divisor" aria-hidden="true" />

      <button
        type="button"
        className="fa-periodo-zona fa-periodo-anio"
        aria-haspopup="listbox"
        aria-expanded={abierto === 'anio'}
        onClick={() => setAbierto((actual) => (actual === 'anio' ? null : 'anio'))}
      >
        {anioAnalizado}
        <CaretDown size={14} />
      </button>

      {abierto === 'mes' && (
        <div className="fa-periodo-menu" role="listbox" aria-label="Mes">
          {MESES.map((mes) => {
            const activo = mes.numero === numeroActual;
            return (
              <button
                key={mes.numero}
                type="button"
                role="option"
                aria-selected={activo}
                className={activo ? 'activo' : ''}
                onClick={() => { onSeleccionarMes(`${anioAnalizado}-${mes.numero}`); setAbierto(null); }}
              >
                {mes.largo}
                {activo && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}

      {abierto === 'anio' && (
        <div className="fa-periodo-menu alineado-derecha" role="listbox" aria-label="Anio">
          {aniosDisponibles.map((anio) => {
            const activo = anio === anioAnalizado;
            return (
              <button
                key={anio}
                type="button"
                role="option"
                aria-selected={activo}
                className={activo ? 'activo' : ''}
                onClick={() => { onSeleccionarAnio(anio); setAbierto(null); }}
              >
                {anio}
                {activo && <Check size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

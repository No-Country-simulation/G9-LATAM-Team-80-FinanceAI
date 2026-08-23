import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from './plantillas/DashboardLayout';
import { rutasAplicacion } from './rutas/rutasAplicacion';
import { DashboardPage } from '../modulos/tablero/presentacion/DashboardPage';
import { TransactionsPage } from '../modulos/transacciones/presentacion/TransactionsPage';
import { FinancialAnalysisPage } from '../modulos/analisis-financiero/presentacion/FinancialAnalysisPage';
import { BudgetsPage } from '../modulos/presupuestos/presentacion/BudgetsPage';
import { RecommendationsPage } from '../modulos/recomendaciones/presentacion/RecommendationsPage';
import { HistoryPage } from '../modulos/historial/presentacion/HistoryPage';
import { SettingsPage } from '../modulos/configuracion/presentacion/SettingsPage';
import { FilesPage } from '../modulos/archivos/presentacion/FilesPage';
import { LoginPage } from '../modulos/autenticacion/presentacion/LoginPage';
import { useFinancialWorkspace } from '../compartido/hooks/useFinancialWorkspace';
import { cerrarSesion, comprobarSesion, iniciarSesion, type Sesion } from '../compartido/servicios/auth.service';
import type { RutaId } from '../compartido/tipos/rutas';

const TOKEN_KEY = 'financeai_session';

export function App() {
  const [rutaActiva, setRutaActiva] = useState<RutaId>('tablero');
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [comprobando, setComprobando] = useState(true);
  const workspace = useFinancialWorkspace(sesion?.token ?? null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setComprobando(false); return; }
    comprobarSesion(token)
      .then((usuario) => setSesion({ token, usuario }))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setComprobando(false));
  }, []);

  async function login(email: string, password: string) {
    const nuevaSesion = await iniciarSesion(email, password);
    localStorage.setItem(TOKEN_KEY, nuevaSesion.token);
    setSesion(nuevaSesion);
  }

  async function logout() {
    if (sesion) await cerrarSesion(sesion.token).catch(() => undefined);
    localStorage.removeItem(TOKEN_KEY); setSesion(null); setRutaActiva('tablero');
  }

  const pagina = useMemo(() => {
    const props = { workspace, navegar: setRutaActiva };
    const paginas: Record<RutaId, JSX.Element> = {
      tablero: <DashboardPage {...props} />, transacciones: <TransactionsPage {...props} />,
      analisis: <FinancialAnalysisPage {...props} />, presupuestos: <BudgetsPage {...props} />,
      recomendaciones: <RecommendationsPage {...props} />, historial: <HistoryPage {...props} />,
      configuracion: <SettingsPage {...props} />, archivos: <FilesPage {...props} />
    };
    return paginas[rutaActiva];
  }, [rutaActiva, workspace]);

  if (comprobando) return <main className="login-page"><section className="login-card"><h2>Comprobando sesion...</h2></section></main>;
  if (!sesion) return <LoginPage onLogin={login} />;

  const partes = sesion.usuario.nombre.split(' ').filter(Boolean);
  const iniciales = partes.slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  return <DashboardLayout rutas={rutasAplicacion} rutaActiva={rutaActiva} onNavigate={setRutaActiva}
    usuario={{ nombre: sesion.usuario.nombre, iniciales, rol: sesion.usuario.rol }} onLogout={logout}
    mesAnalizado={workspace.mesAnalizado} mesesDisponibles={workspace.mesesDisponibles}
    onSeleccionarMes={workspace.seleccionarMes}>
    {pagina}
  </DashboardLayout>;
}


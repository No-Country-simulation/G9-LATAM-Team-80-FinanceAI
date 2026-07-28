import { useMemo, useState } from 'react';
import { DashboardLayout } from './plantillas/DashboardLayout';
import { rutasAplicacion } from './rutas/rutasAplicacion';
import { AuthProvider } from './proveedores/AuthProvider';
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
import type { RutaId } from '../compartido/tipos/rutas';

export function App() {
  const [rutaActiva, setRutaActiva] = useState<RutaId>('tablero');
  const [autenticado, setAutenticado] = useState(false);
  const workspace = useFinancialWorkspace();

  const pagina = useMemo(() => {
    const props = { workspace, navegar: setRutaActiva };

    const paginas: Record<RutaId, JSX.Element> = {
      tablero: <DashboardPage {...props} />,
      transacciones: <TransactionsPage {...props} />,
      analisis: <FinancialAnalysisPage {...props} />,
      presupuestos: <BudgetsPage {...props} />,
      recomendaciones: <RecommendationsPage {...props} />,
      historial: <HistoryPage {...props} />,
      configuracion: <SettingsPage {...props} />,
      archivos: <FilesPage {...props} />
    };

    return paginas[rutaActiva];
  }, [rutaActiva, workspace]);

  return (
    <AuthProvider autenticado={autenticado} iniciarSesion={() => setAutenticado(true)}>
      {!autenticado ? (
        <LoginPage onLogin={() => setAutenticado(true)} />
      ) : (
        <DashboardLayout
          rutas={rutasAplicacion}
          rutaActiva={rutaActiva}
          onNavigate={setRutaActiva}
          usuario={{ nombre: 'Juan Diego', iniciales: 'JD', rol: 'Usuario' }}
        >
          {pagina}
        </DashboardLayout>
      )}
    </AuthProvider>
  );
}

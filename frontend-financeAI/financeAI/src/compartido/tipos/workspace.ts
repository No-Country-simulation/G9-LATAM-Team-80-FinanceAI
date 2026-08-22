import type { useFinancialWorkspace } from '../hooks/useFinancialWorkspace';
import type { RutaId } from './rutas';

export type FinancialWorkspace = ReturnType<typeof useFinancialWorkspace>;

export type PageProps = {
  workspace: FinancialWorkspace;
  navegar: (ruta: RutaId) => void;
};

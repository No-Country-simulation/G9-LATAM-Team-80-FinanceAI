import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

type AuthContextValue = {
  autenticado: boolean;
  iniciarSesion: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  autenticado,
  iniciarSesion,
  children
}: PropsWithChildren<AuthContextValue>) {
  return (
    <AuthContext.Provider value={{ autenticado, iniciarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}

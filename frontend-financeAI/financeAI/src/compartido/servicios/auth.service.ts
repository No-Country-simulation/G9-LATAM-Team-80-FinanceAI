import { apiRequest } from './api.service';

export type UsuarioSesion = { id: number; nombre: string; email: string; rol: string };
export type Sesion = { token: string; usuario: UsuarioSesion };

export function iniciarSesion(email: string, password: string) {
  return apiRequest<Sesion>('/api/auth/login', undefined, {
    method: 'POST', body: JSON.stringify({ email, password })
  });
}
export function comprobarSesion(token: string) {
  return apiRequest<UsuarioSesion>('/api/auth/me', token);
}
export function cerrarSesion(token: string) {
  return apiRequest<void>('/api/auth/logout', token, { method: 'POST' });
}


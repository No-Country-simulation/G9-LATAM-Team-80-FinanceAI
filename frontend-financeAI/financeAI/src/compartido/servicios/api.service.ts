const API_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Un 400 de validacion trae, ademas del mensaje generico, un detalle por campo
 * (GlobalExceptionHandler lo arma como "errores"). Antes se descartaba y solo llegaba
 * el mensaje generico, asi que ninguna pantalla podia decir CUAL dato estaba mal --
 * por ejemplo, cual fila de una importacion. `errores` los conserva para quien los
 * necesite; quien no los use sigue leyendo `.message` como antes.
 */
export class ApiError extends Error {
  readonly errores: Record<string, string>;
  constructor(mensaje: string, errores: Record<string, string> = {}) {
    super(mensaje);
    this.name = 'ApiError';
    this.errores = errores;
  }
}

export async function apiRequest<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { mensaje?: string; detail?: string; errores?: Record<string, string> } | null;
    throw new ApiError(body?.mensaje ?? body?.detail ?? `La solicitud fallo (${response.status}).`, body?.errores ?? {});
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}


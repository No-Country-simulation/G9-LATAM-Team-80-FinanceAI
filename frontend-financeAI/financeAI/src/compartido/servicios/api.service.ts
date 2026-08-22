const API_URL = import.meta.env.VITE_API_URL ?? '';

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
    const body = await response.json().catch(() => null) as { mensaje?: string; detail?: string } | null;
    throw new Error(body?.mensaje ?? body?.detail ?? `La solicitud fallo (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}


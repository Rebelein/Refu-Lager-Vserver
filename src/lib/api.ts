const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || runtimeOrigin || 'http://localhost:4000';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  list: <T>(col: string) => http<T[]>(`/api/${trim(col)}`),
  get: <T>(col: string, id: string) => http<T>(`/api/${trim(col)}/${id}`),
  upsert: <T>(col: string, id: string, data: any) => http<T>(`/api/${trim(col)}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  create: <T>(col: string, data: any) => http<T>(`/api/${trim(col)}`, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(col: string, id: string, data: any) => http<T>(`/api/${trim(col)}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (col: string, id: string) => fetch(`${API_BASE}/api/${trim(col)}/${id}`, { method: 'DELETE' }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); }),
};

function trim(col: string) { return col.replace(/^\/+|\/+$/g, ''); }

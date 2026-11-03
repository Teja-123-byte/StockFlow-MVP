// Tiny fetch wrapper. The auth cookie is httpOnly, so the browser sends it automatically.
async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (b) => request('POST', '/auth/login', b),
  signup: (b) => request('POST', '/auth/signup', b),
  logout: () => request('POST', '/auth/logout'),
  dashboard: () => request('GET', '/dashboard'),
  products: (search = '') => request('GET', `/products?search=${encodeURIComponent(search)}`),
  createProduct: (b) => request('POST', '/products', b),
  updateProduct: (id, b) => request('PUT', `/products/${id}`, b),
  adjustProduct: (id, b) => request('POST', `/products/${id}/adjust`, b),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),
  settings: () => request('GET', '/settings'),
  saveSettings: (b) => request('PUT', '/settings', b),
};

export const money = (v) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

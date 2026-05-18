const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export { API_BASE };

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('animaflow_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('animaflow_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
  }

  // Handle no-content responses
  if (res.status === 204) return {} as T;

  return res.json();
}

export async function apiUpload<T>(
  endpoint: string,
  file: File,
  additionalFields?: Record<string, string>,
): Promise<T> {
  const token = localStorage.getItem('animaflow_token');

  const formData = new FormData();
  formData.append('file', file);
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Don't set Content-Type — browser sets it with multipart boundary
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('animaflow_token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `API error: ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// Export convenience methods
export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint: string) => apiFetch(endpoint, { method: 'DELETE' }),
};

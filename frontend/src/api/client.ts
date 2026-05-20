const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export { API_BASE };

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('animaflow_token');

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('animaflow_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `API error: ${response.status}`);
    }

    // Handle no-content responses
    if (response.status === 204) return {} as T;

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.', { cause: error });
    }
    throw error;
  }
}

export async function apiUpload<T>(
  endpoint: string,
  file: File,
  additionalFields?: Record<string, string>,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
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

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('animaflow_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `API error: ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.', { cause: error });
    }
    throw error;
  }
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

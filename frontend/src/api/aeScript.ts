import { API_BASE } from './client';

/**
 * Descarga el AE ExtendScript (.jsx) de un solo componente para probarlo en
 * After Effects de forma aislada. Envía las props actuales (o {} para defaults).
 */
export async function downloadComponentAEScript(
  name: string,
  props: Record<string, unknown> = {},
  opts: { width?: number; height?: number; fps?: number; duration?: number } = {},
): Promise<void> {
  const token = localStorage.getItem('animaflow_token');
  const res = await fetch(`${API_BASE}/api/admin/components/${encodeURIComponent(name)}/ae-script`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      props,
      width: opts.width ?? 1080,
      height: opts.height ?? 1920,
      fps: opts.fps ?? 30,
      duration: opts.duration ?? 5,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Error ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.jsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

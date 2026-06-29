import { useState, useEffect, useCallback } from 'react';
import { Sliders, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { Spec } from '../../types/spec';

interface EditableValue {
  name: string;
  label?: string;
  type: 'number' | 'color' | 'string' | 'number[]';
  value: number | string | number[];
}

/** Editor MANUAL de valores (colores/números/textos/arrays) de UNA escena code-gen. Sin IA. */
export function SceneValueEditor({
  jobId,
  sceneIndex,
  scene,
  onSpecChange,
}: {
  jobId: string;
  sceneIndex: number;
  scene: Spec;
  onSpecChange?: (sceneIndex: number, updatedScene: Spec) => void;
}) {
  const [values, setValues] = useState<EditableValue[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ values: EditableValue[] }>(
        `/api/jobs/${jobId}/scenes/${sceneIndex}/values`,
      );
      setValues(data.values || []);
    } catch {
      setValues([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, sceneIndex]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = useCallback(
    async (name: string, value: number | string | number[]) => {
      try {
        const data = await api.post<{ custom_code: string; values: EditableValue[] }>(
          `/api/jobs/${jobId}/scenes/${sceneIndex}/values`,
          { changes: { [name]: value } },
        );
        setValues(data.values || []);
        // Refresca el preview con el nuevo código (sin re-renderizar mp4).
        if (onSpecChange) onSpecChange(sceneIndex, { ...scene, custom_code: data.custom_code });
      } catch {
        /* silencioso: el preview no cambia si falla */
      }
    },
    [jobId, sceneIndex, scene, onSpecChange],
  );

  if (loading && values.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary/40 flex items-center gap-1.5 px-1 py-2">
        <Loader2 size={12} className="animate-spin" /> Cargando valores…
      </p>
    );
  }

  if (values.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary/40 px-1 py-2">
        Sin valores editables. (Regenera la escena para obtener consts editables.)
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary/70 mb-2">
        <Sliders size={12} /> Valores editables ({values.length}) — instantáneo, sin IA
      </div>
      <div className="space-y-1.5">
        {values.map((v) => (
          <div
            key={`${v.name}:${Array.isArray(v.value) ? v.value.join(',') : v.value}`}
            className="flex items-center gap-2"
          >
            <span className="font-mono text-[11px] text-text-secondary/70 w-28 truncate" title={v.label ?? v.name}>
              {v.label ?? v.name}
            </span>
            {v.type === 'color' ? (
              <input
                type="color"
                defaultValue={String(v.value)}
                onChange={(e) => apply(v.name, e.target.value)}
                className="w-8 h-7 rounded border border-border-tech bg-transparent cursor-pointer"
              />
            ) : v.type === 'number' ? (
              <input
                type="number"
                step="any"
                defaultValue={Number(v.value)}
                onBlur={(e) => apply(v.name, parseFloat(e.target.value))}
                className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary font-mono text-xs"
              />
            ) : v.type === 'number[]' ? (
              <div className="flex gap-1 flex-wrap flex-1">
                {(v.value as number[]).map((n, idx) => (
                  <input
                    key={idx}
                    type="number"
                    step="any"
                    defaultValue={n}
                    onBlur={(e) => {
                      const arr = [...(v.value as number[])];
                      arr[idx] = parseFloat(e.target.value);
                      apply(v.name, arr);
                    }}
                    className="w-14 bg-surface-container border border-border-tech rounded px-1 py-1 text-text-primary font-mono text-xs"
                  />
                ))}
              </div>
            ) : (
              <input
                type="text"
                defaultValue={String(v.value)}
                onBlur={(e) => apply(v.name, e.target.value)}
                className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

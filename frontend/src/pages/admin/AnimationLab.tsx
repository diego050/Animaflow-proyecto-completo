import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, FlaskConical, Sparkles, Loader2, AlertTriangle, Boxes, Sliders, Scissors } from 'lucide-react';
import { api } from '../../api/client';
import { compileAnimation } from '../../remotion/compileAnimation';
import { CustomCode } from '../../remotion/CustomCode';
import { analyzeCode, applyValueRef, setElementColor, type ValueRef } from '../../remotion/groupDetector';

interface GenResponse {
  code: string;
  width: number;
  height: number;
  duration_frames: number;
  model: string;
}

/**
 * Laboratorio AISLADO para la edición por-elemento (Camino B). No toca el pipeline, el editor
 * de video ni el render-server. Fase 1: detecta grupos repetidos en el código (solo lectura).
 */
export function AnimationLab() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<GenResponse | null>(null);

  const compiled = useMemo(() => {
    if (!code) return { Comp: null as React.FC | null, error: null as string | null };
    try {
      return { Comp: compileAnimation(code), error: null };
    } catch (e) {
      return { Comp: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [code]);

  // Fase 1-2: análisis determinista (valores sueltos + grupos), en el navegador, instantáneo.
  const analysis = useMemo(() => analyzeCode(code), [code]);

  const [expandedPE, setExpandedPE] = useState<Set<number>>(new Set());
  const [editWarning, setEditWarning] = useState<string | null>(null);

  // Revertir automático: aplica el código nuevo SOLO si compila; si lo rompe, lo descarta.
  const commit = useCallback((newCode: string) => {
    try {
      compileAnimation(newCode);
      setCode(newCode);
      setEditWarning(null);
    } catch {
      setEditWarning('Ese cambio rompía la animación — se descartó automáticamente.');
    }
  }, []);

  // Fase 2: edita un valor (suelto o de grupo) reescribiendo solo ese pedacito (con auto-revert).
  const editControl = useCallback(
    (ref: ValueRef, newValue: number | string) => commit(applyValueRef(code, ref, newValue)),
    [code, commit],
  );

  // Fase 3: fija el color de UN elemento del grupo (override por índice).
  const setElemColor = useCallback(
    (groupId: number, index: number, color: string) => commit(setElementColor(code, groupId, index, color)),
    [code, commit],
  );

  // Input adecuado según el tipo de valor (color / número / texto).
  const valueInput = (v: ValueRef) => {
    if (v.type === 'color') {
      return (
        <input
          type="color"
          defaultValue={String(v.value)}
          onChange={(e) => editControl(v, e.target.value)}
          className="w-8 h-7 rounded border border-border-tech bg-transparent cursor-pointer shrink-0"
        />
      );
    }
    if (v.type === 'number') {
      const isCount = v.role === 'count';
      return (
        <input
          type="number"
          step={isCount ? 1 : 'any'}
          min={isCount ? 1 : undefined}
          defaultValue={Number(v.value)}
          onBlur={(e) =>
            editControl(
              v,
              isCount
                ? Math.max(1, Math.min(300, parseInt(e.target.value) || 1))
                : parseFloat(e.target.value) || 0,
            )
          }
          className="w-24 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary font-mono"
        />
      );
    }
    return (
      <input
        type="text"
        defaultValue={String(v.value)}
        onBlur={(e) => editControl(v, e.target.value)}
        className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary"
      />
    );
  };

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<GenResponse>(
        '/api/admin/animations/generate',
        { prompt: prompt.trim(), duration_seconds: 6 },
        { timeoutMs: 180000 },
      );
      setCode(data.code);
      setMeta(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando la animación.');
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const previewH = 520;
  const previewW = meta ? Math.round((previewH * meta.width) / meta.height) : Math.round((previewH * 1080) / 1920);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-surface-high rounded-lg text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <FlaskConical size={22} className="text-mint-precision" /> Lab — Edición por elemento
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Aislado. Fase 1: detecta los grupos repetidos del código (solo lectura, sin tocar nada más).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* IZQUIERDA: entrada + código + detección */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
              placeholder="Genera una animación (ej. música con partículas verdes)…"
              className="flex-1 bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-mint-precision"
            />
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 bg-mint-precision text-surface-lowest font-semibold px-4 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generar
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Código (pega uno o genera arriba)
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              rows={12}
              placeholder="Pega aquí el código de una animación para analizarlo…"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg p-3 text-text-secondary/80 font-mono text-[11px] focus:outline-none focus:border-mint-precision resize-y"
            />
          </div>

          {analysis.error && (
            <p className="text-xs text-red-400 border border-red-500/30 rounded-lg p-3">
              No se pudo analizar el código: {analysis.error}
            </p>
          )}

          {editWarning && (
            <p className="text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg p-3">
              ⚠ {editWarning}
            </p>
          )}

          {/* Panel: VALORES sueltos (fondo, textos, colores fuera de loops) */}
          {code && !analysis.error && (
            <div className="border border-border-tech rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
                <Sliders size={16} className="text-mint-precision" /> Valores ({analysis.values.length})
              </div>
              {analysis.values.length === 0 ? (
                <p className="text-xs text-text-secondary/40">Sin valores sueltos editables.</p>
              ) : (
                <div className="space-y-1.5">
                  {analysis.values.map((v, i) => (
                    <div key={`${v.label}-${v.value}-${i}`} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-text-secondary/70 w-40 truncate" title={v.label}>
                        {v.label}
                      </span>
                      {valueInput(v)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel: SEPARAR color compartido (usos sueltos) */}
          {code && !analysis.error && analysis.splits.length > 0 && (
            <div className="border border-border-tech rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-1">
                <Scissors size={16} className="text-mint-precision" /> Separar color compartido ({analysis.splits.length})
              </div>
              <p className="text-[10px] text-text-secondary/40 mb-3">
                Estos elementos usan un color compartido. Edítalos para darles un color propio sin afectar el resto.
              </p>
              <div className="space-y-1.5">
                {analysis.splits.map((s, i) => (
                  <div key={`${s.label}-${s.start}-${s.value}-${i}`} className="flex items-center gap-2 text-xs">
                    {valueInput(s)}
                    <span className="font-mono text-[10px] text-text-secondary/50 truncate" title={s.context}>
                      {s.label} · {s.context}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Panel: GRUPOS (loops) — cantidad + color de todo el grupo */}
          {code && !analysis.error && (
            <div className="border border-border-tech rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
                <Boxes size={16} className="text-mint-precision" /> Grupos ({analysis.groups.length})
              </div>
              {analysis.groups.length === 0 ? (
                <p className="text-xs text-text-secondary/40">
                  No se detectaron grupos repetidos (Array.from / .map).
                </p>
              ) : (
                <div className="space-y-2.5">
                  {analysis.groups.map((g) => (
                    <div key={g.id} className="bg-surface-lowest border border-border-tech rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-text-primary">
                          Grupo {g.id + 1} · {g.count >= 0 ? `${g.count} elementos` : 'cantidad dinámica'}
                        </span>
                        <span className="font-mono text-[10px] text-text-secondary/50">{g.kind}</span>
                      </div>
                      {g.controls.length > 0 ? (
                        <div className="space-y-1.5">
                          {g.controls.map((ctrl, ci) => (
                            <div key={`${ctrl.role}-${ctrl.label}-${ctrl.value}-${ci}`} className="flex items-center gap-2">
                              <span className="font-mono text-text-secondary/70 w-32 truncate" title={ctrl.label}>
                                {ctrl.role === 'count' ? 'Cantidad' : ctrl.label}
                              </span>
                              {valueInput(ctrl)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-text-secondary/40">Sin valores editables en este grupo.</p>
                      )}
                      {g.perElement.available && g.count > 0 && g.count <= 100 && (
                        <div className="mt-2 border-t border-border-tech/50 pt-2">
                          <button
                            onClick={() =>
                              setExpandedPE((prev) => {
                                const s = new Set(prev);
                                if (s.has(g.id)) s.delete(g.id);
                                else s.add(g.id);
                                return s;
                              })
                            }
                            className="text-[11px] text-mint-precision hover:underline"
                          >
                            {expandedPE.has(g.id) ? '▾' : '▸'} Editar por elemento ({g.count})
                          </button>
                          {expandedPE.has(g.id) && (
                            <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-auto pr-1">
                              {Array.from({ length: g.count }).map((_, k) => {
                                const ov = g.perElement.overrides[k];
                                const eff = ov ?? g.perElement.resolvedBase;
                                return (
                                  <div key={`${g.id}-${k}-${eff}`} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-text-secondary/50 w-7">#{k + 1}</span>
                                    <input
                                      type="color"
                                      defaultValue={eff}
                                      onChange={(e) => setElemColor(g.id, k, e.target.value)}
                                      className="w-7 h-6 rounded border border-border-tech bg-transparent cursor-pointer"
                                    />
                                    {ov && (
                                      <button
                                        onClick={() => setElemColor(g.id, k, '')}
                                        title="Quitar excepción (volver al color del grupo)"
                                        className="text-[11px] text-text-secondary/40 hover:text-red-400"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {!g.perElement.available && g.perElement.reason && (
                        <p className="mt-2 text-[10px] text-text-secondary/30">
                          Por elemento: no disponible ({g.perElement.reason}).
                        </p>
                      )}
                      <pre className="mt-2 text-[10px] text-text-secondary/40 font-mono whitespace-pre-wrap break-all">
                        {g.snippet}…
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* DERECHA: preview */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-text-secondary mb-2">
            {meta ? `${meta.width}×${meta.height} · ${meta.duration_frames}f · ${meta.model}` : 'Preview'}
          </div>
          <div
            className="rounded-2xl overflow-hidden border border-border-tech bg-surface-lowest shadow-2xl"
            style={{ width: previewW, height: previewH }}
          >
            {compiled.Comp ? (
              <Player
                key={code}
                component={CustomCode}
                inputProps={{
                  code,
                  durationInFrames: meta?.duration_frames ?? 180,
                  width: meta?.width ?? 1080,
                  height: meta?.height ?? 1920,
                }}
                durationInFrames={meta?.duration_frames ?? 180}
                fps={30}
                compositionWidth={meta?.width ?? 1080}
                compositionHeight={meta?.height ?? 1920}
                style={{ width: previewW, height: previewH }}
                controls
                loop
                autoPlay
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-text-secondary/50 text-sm p-6">
                {compiled.error ? (
                  <div className="text-red-400">
                    <AlertTriangle size={28} className="mx-auto mb-2" />
                    <div className="text-xs mt-2 font-mono">{compiled.error}</div>
                  </div>
                ) : (
                  'El preview aparecerá aquí'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

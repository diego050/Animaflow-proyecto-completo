import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, FlaskConical, Sparkles, Loader2, AlertTriangle, Boxes } from 'lucide-react';
import { api } from '../../api/client';
import { compileAnimation } from '../../remotion/compileAnimation';
import { CustomCode } from '../../remotion/CustomCode';
import { detectGroups } from '../../remotion/groupDetector';

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

  // Fase 1: detección determinista de grupos (corre en el navegador, instantáneo).
  const detection = useMemo(() => detectGroups(code), [code]);

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

          {/* Panel de detección (Fase 1) */}
          <div className="border border-border-tech rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
              <Boxes size={16} className="text-mint-precision" /> Grupos detectados
            </div>
            {detection.error ? (
              <p className="text-xs text-red-400">No se pudo analizar el código: {detection.error}</p>
            ) : !code ? (
              <p className="text-xs text-text-secondary/40">Genera o pega un código para analizarlo.</p>
            ) : detection.groups.length === 0 ? (
              <p className="text-xs text-text-secondary/40">
                No se detectaron grupos repetidos (Array.from / .map). Esta animación no tiene loops de elementos.
              </p>
            ) : (
              <div className="space-y-2.5">
                {detection.groups.map((g) => (
                  <div key={g.id} className="bg-surface-lowest border border-border-tech rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-text-primary">
                        Grupo {g.id + 1} · {g.count >= 0 ? `${g.count} elementos` : 'cantidad dinámica'}
                      </span>
                      <span className="font-mono text-[10px] text-text-secondary/50">{g.kind}</span>
                    </div>
                    {(g.colorsInBody.length > 0 || g.identifiersInStyle.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {g.colorsInBody.map((c) => (
                          <span key={c} className="flex items-center gap-1 text-[10px] text-text-secondary/70">
                            <span className="w-3 h-3 rounded-sm border border-border-tech" style={{ background: c }} />
                            {c}
                          </span>
                        ))}
                        {g.identifiersInStyle.map((idn) => (
                          <span key={idn} className="text-[10px] font-mono text-mint-precision/80 bg-mint-precision/10 px-1.5 py-0.5 rounded">
                            {idn}
                          </span>
                        ))}
                      </div>
                    )}
                    <pre className="mt-2 text-[10px] text-text-secondary/40 font-mono whitespace-pre-wrap break-all">
                      {g.snippet}…
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
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

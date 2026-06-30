import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2, AlertTriangle, Loader2, Film, Download, Layers, Undo2, Redo2, Shuffle, Star } from 'lucide-react';
import { Player } from '@remotion/player';
import { CustomCode } from '../../remotion/CustomCode';
import { useHistory } from '../../hooks/useHistory';
import { api } from '../../api/client';
import { compileAnimation } from '../../remotion/compileAnimation';
import { useAuthStore } from '../../store/useAuthStore';
import { CodeValueEditor } from '../../components/project/CodeValueEditor';
import { VisualEditor } from '../../components/project/VisualEditor';
import { tagElements } from '../../remotion/aeTranslator';

interface GenResponse {
  code: string;
  valid: boolean;
  errors: string[];
  model: string;
  width: number;
  height: number;
  duration_frames: number;
  fps: number;
  edit_mode?: 'surgical' | 'full' | 'create';
  changes?: { before: string; after: string }[];
}

/**
 * Página unificada de animaciones (admin): generar, editar con IA (surgical), editor manual
 * determinista (valores/separar/grupos/por-elemento, mismo `CodeValueEditor` que el editor de
 * video), editar código a mano y renderizar a mp4. Reemplaza la antigua "Crear Animación".
 */
export function AnimationLab() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(6);
  const [fps, setFps] = useState(30);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [modelOverride, setModelOverride] = useState('');
  const [designMd, setDesignMd] = useState(''); // opt-in: brand kit / design.md
  const [variations, setVariations] = useState<{ code: string; meta: GenResponse }[]>([]);
  const [variationCount, setVariationCount] = useState(3);
  const [varying, setVarying] = useState(false);
  const [flywheelMsg, setFlywheelMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeHistory = useHistory('');
  const code = codeHistory.value;
  const setCode = codeHistory.set; // ediciones = paso deshacible
  const [meta, setMeta] = useState<GenResponse | null>(null);
  const [genErrors, setGenErrors] = useState<string[]>([]);
  const [editInstruction, setEditInstruction] = useState('');

  const [rendering, setRendering] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [aeExporting, setAeExporting] = useState(false);
  const [aeError, setAeError] = useState<string | null>(null);

  const compiled = useMemo(() => {
    if (!code) return { Comp: null as React.FC | null, error: null as string | null };
    try {
      return { Comp: compileAnimation(code), error: null };
    } catch (e) {
      return { Comp: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [code]);

  const callGenerate = useCallback(async (body: Record<string, unknown>, apply: (c: string) => void) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<GenResponse>('/api/admin/animations/generate', body, { timeoutMs: 180000 });
      apply(data.code); // generar = reset historial; editar con IA = paso deshacible
      setMeta(data);
      setGenErrors(data.errors || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando la animación.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      setError('Escribe una descripción.');
      return;
    }
    callGenerate(
      {
        prompt: prompt.trim(),
        duration_seconds: durationSeconds,
        fps,
        aspect_ratio: aspectRatio,
        model: modelOverride.trim() || undefined,
        design_md: designMd.trim() || undefined, // opt-in
      },
      codeHistory.reset, // animación nueva → historial limpio
    );
  }, [prompt, durationSeconds, fps, aspectRatio, modelOverride, designMd, callGenerate, codeHistory.reset]);

  // Opt-in: 3 variaciones en paralelo (solo cuando se pide). Elegir una la pone como la animación.
  const handleVariations = useCallback(async () => {
    if (!prompt.trim()) { setError('Escribe una descripción.'); return; }
    setVarying(true);
    setError(null);
    setVariations([]);
    const body = {
      prompt: prompt.trim(),
      duration_seconds: durationSeconds,
      fps,
      aspect_ratio: aspectRatio,
      model: modelOverride.trim() || undefined,
      design_md: designMd.trim() || undefined,
      variation: true,
    };
    try {
      const n = Math.max(2, Math.min(6, variationCount));
      const results = await Promise.all(
        Array.from({ length: n }).map(() => api.post<GenResponse>('/api/admin/animations/generate', body, { timeoutMs: 180000 })),
      );
      setVariations(results.map((m) => ({ code: m.code, meta: m })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando variaciones.');
    } finally {
      setVarying(false);
    }
  }, [prompt, durationSeconds, fps, aspectRatio, modelOverride, designMd, variationCount]);

  const pickVariation = useCallback(
    (v: { code: string; meta: GenResponse }) => {
      codeHistory.reset(v.code);
      setMeta(v.meta);
      setGenErrors(v.meta.errors || []);
      setVariations([]);
    },
    [codeHistory.reset],
  );

  // ⭐ Curar al flywheel (manual). Se acumula; aún NO se usa para generar (retrieval apagado).
  const handleFlywheel = useCallback(async () => {
    if (!code) return;
    setFlywheelMsg('Guardando…');
    try {
      const r = await api.post<{ added: boolean; reason: string }>(
        '/api/admin/animations/flywheel/add',
        { code, prompt: prompt.trim(), aspect_ratio: aspectRatio },
      );
      setFlywheelMsg(r.reason);
    } catch (e) {
      setFlywheelMsg(e instanceof Error ? e.message : 'Error guardando en el flywheel.');
    }
  }, [code, prompt, aspectRatio]);

  const handleEdit = useCallback(() => {
    if (!editInstruction.trim() || !code) return;
    callGenerate(
      {
        prompt: prompt.trim() || 'animación',
        duration_seconds: durationSeconds,
        model: modelOverride.trim() || undefined,
        previous_code: code,
        edit_instruction: editInstruction.trim(),
      },
      codeHistory.set, // edición con IA → paso deshacible
    );
    setEditInstruction('');
  }, [editInstruction, code, prompt, durationSeconds, modelOverride, callGenerate, codeHistory.set]);

  // Atajos Ctrl/Cmd+Z (deshacer) y Ctrl/Cmd+Shift+Z (rehacer), salvo escribiendo en un input/textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      if (e.shiftKey) codeHistory.redo();
      else codeHistory.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [codeHistory.undo, codeHistory.redo]);

  const handleRender = useCallback(async () => {
    if (!code || !meta) return;
    setRendering(true);
    setRenderError(null);
    setVideoUrl(null);
    try {
      const data = await api.post<{ video_url: string; anim_id: string }>(
        '/api/admin/animations/render',
        { code, width: meta.width, height: meta.height, duration_frames: meta.duration_frames, fps: meta.fps },
        { timeoutMs: 600000 },
      );
      const token = useAuthStore.getState().token;
      const resp = await fetch(data.video_url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error(`No se pudo cargar el video (${resp.status})`);
      setVideoUrl(URL.createObjectURL(await resp.blob()));
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'Error renderizando el mp4.');
    } finally {
      setRendering(false);
    }
  }, [code, meta]);

  // Export AE editable (beta): etiqueta el código → muestrea en el render-server → descarga .jsx.
  const handleAeExport = useCallback(async () => {
    if (!code || !meta) return;
    setAeExporting(true);
    setAeError(null);
    try {
      const tagged = tagElements(code);
      if (tagged.error) throw new Error('No se pudo analizar el código: ' + tagged.error);
      const data = await api.post<{ jsx: string; elements: number }>(
        '/api/admin/animations/ae-export',
        {
          code: tagged.taggedCode,
          width: meta.width,
          height: meta.height,
          fps: meta.fps,
          duration_frames: meta.duration_frames,
        },
        { timeoutMs: 300000 },
      );
      const blob = new Blob([data.jsx], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animaflow-ae.jsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setAeError(e instanceof Error ? e.message : 'Error exportando a AE.');
    } finally {
      setAeExporting(false);
    }
  }, [code, meta]);

  // Preview ENCAJADA en una caja máxima (no deformar ni desbordar en horizontal 16:9, etc.).
  const PREVIEW_MAX_W = 520;
  const PREVIEW_MAX_H = 560;
  const previewAR = meta ? meta.width / meta.height : 1080 / 1920;
  let previewW = Math.round(PREVIEW_MAX_H * previewAR);
  let previewH = PREVIEW_MAX_H;
  if (previewW > PREVIEW_MAX_W) {
    previewW = PREVIEW_MAX_W;
    previewH = Math.round(PREVIEW_MAX_W / previewAR);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-surface-high rounded-lg text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <Sparkles size={22} className="text-mint-precision" /> Crear / Editar Animación
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Genera con IA, edita por chat o a mano (valores, separar, por elemento), y renderiza a mp4.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IZQUIERDA: controles + edición */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Describe la animación</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Ej: una cifra '+250%' con rebote sobre partículas azules, estilo reel…"
              className="w-full bg-surface-container border border-border-tech rounded-lg p-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-mint-precision resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-secondary mb-1">Duración (s)</label>
              <input
                type="number" min={0.5} max={30} step={0.5} value={durationSeconds}
                onChange={(e) => setDurationSeconds(Math.max(0.5, Math.min(30, Number(e.target.value) || 6)))}
                className="w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint-precision"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-secondary mb-1">FPS</label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint-precision"
              >
                {[24, 25, 30, 50, 60].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-secondary mb-1">Frames ({fps}fps)</label>
              <input
                type="number" min={5} max={1800} step={1} value={Math.round(durationSeconds * fps)}
                onChange={(e) => setDurationSeconds(Math.max(5, Math.min(1800, Number(e.target.value) || fps * 6)) / fps)}
                className="w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint-precision"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-secondary mb-1">Formato</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-mint-precision"
              >
                {['9:16', '16:9', '1:1', '4:5', '3:4', '4:3', '21:9'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-medium text-text-secondary mb-1">Modelo (opcional)</label>
              <input
                type="text" value={modelOverride} onChange={(e) => setModelOverride(e.target.value)}
                placeholder="default (ej. gemini-3.5-flash)"
                className="w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-mint-precision"
              />
            </div>
          </div>

          {/* Brand kit / design.md — OPT-IN: solo influye si lo llenas */}
          <details className="text-xs">
            <summary className="cursor-pointer text-text-secondary hover:text-text-primary">Brand kit / design.md (opcional)</summary>
            <textarea
              value={designMd}
              onChange={(e) => setDesignMd(e.target.value)}
              rows={4}
              placeholder="Tu marca: colores, fuente, estilo. Ej: colores #0f172a y #22c55e, fuente Inter, look minimalista oscuro. Solo se usa si lo llenas."
              className="mt-2 w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-mint-precision font-mono text-[11px]"
            />
          </details>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading || varying}
              className="flex-1 flex items-center justify-center gap-2 bg-mint-precision text-surface-lowest font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'Generando…' : 'Generar'}
            </button>
            <input
              type="number" min={2} max={6} step={1} value={variationCount}
              onChange={(e) => setVariationCount(Math.max(2, Math.min(6, Number(e.target.value) || 3)))}
              title="Cuántas variaciones (2–6)"
              className="w-14 bg-surface-container border border-border-tech rounded-lg px-2 py-2.5 text-sm text-text-primary text-center focus:outline-none focus:border-mint-precision"
            />
            <button
              onClick={handleVariations}
              disabled={loading || varying}
              title={`Genera ${variationCount} variaciones en paralelo para elegir`}
              className="flex items-center justify-center gap-2 border border-border-tech text-text-primary font-semibold px-3 py-2.5 rounded-lg hover:border-mint-precision disabled:opacity-50"
            >
              {varying ? <Loader2 size={18} className="animate-spin" /> : <Shuffle size={18} />}
              {varying ? 'Variando…' : 'Variaciones'}
            </button>
          </div>

          {variations.length > 0 && (
            <div className="border border-border-tech rounded-lg p-3">
              <div className="text-xs font-semibold text-text-primary mb-2">Elige una variación</div>
              <div className="grid grid-cols-3 gap-2">
                {variations.map((v, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="rounded-lg overflow-hidden border border-border-tech bg-surface-lowest" style={{ aspectRatio: `${v.meta.width} / ${v.meta.height}` }}>
                      <Player
                        component={CustomCode}
                        inputProps={{ code: v.code, durationInFrames: v.meta.duration_frames, width: v.meta.width, height: v.meta.height, fps: v.meta.fps }}
                        durationInFrames={v.meta.duration_frames}
                        fps={v.meta.fps}
                        compositionWidth={v.meta.width}
                        compositionHeight={v.meta.height}
                        style={{ width: '100%', height: '100%' }}
                        loop
                        autoPlay
                      />
                    </div>
                    <button onClick={() => pickVariation(v)} className="text-[11px] bg-mint-precision/90 text-surface-lowest rounded py-1 font-medium hover:opacity-90">
                      Usar {i + 1}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {genErrors.length > 0 && (
            <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <div className="font-medium mb-1">La IA no cumplió algunas reglas (se mostró igual):</div>
              <ul className="list-disc list-inside space-y-0.5">
                {genErrors.map((er, i) => <li key={i}>{er}</li>)}
              </ul>
            </div>
          )}

          {/* Edición con IA (surgical) */}
          {code && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Editar con IA (cambio puntual)</label>
              <div className="flex gap-2">
                <input
                  type="text" value={editInstruction} onChange={(e) => setEditInstruction(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                  placeholder="Ej: pon el círculo más a la derecha y en rojo"
                  className="flex-1 bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-mint-precision"
                />
                <button
                  onClick={handleEdit} disabled={loading || !editInstruction.trim()}
                  className="flex items-center gap-1 bg-surface-high border border-border-tech text-text-primary px-3 rounded-lg hover:border-mint-precision disabled:opacity-50 text-sm"
                >
                  <Wand2 size={15} /> Aplicar
                </button>
              </div>
            </div>
          )}

          {meta?.edit_mode === 'surgical' && meta.changes && meta.changes.length > 0 && (
            <div className="text-xs">
              <p className="text-text-secondary mb-1.5 font-medium">Cambios ({meta.changes.length}):</p>
              <div className="space-y-2">
                {meta.changes.map((c, i) => (
                  <div key={i} className="border border-border-tech rounded-lg overflow-hidden font-mono text-[11px]">
                    <pre className="bg-red-500/10 text-red-300/90 px-3 py-1.5 whitespace-pre-wrap overflow-auto max-h-28 border-b border-border-tech">- {c.before}</pre>
                    <pre className="bg-mint-precision/10 text-mint-precision/90 px-3 py-1.5 whitespace-pre-wrap overflow-auto max-h-28">+ {c.after}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
          {meta?.edit_mode === 'full' && (
            <p className="text-xs text-cadmium-orange/80">No se pudo editar por bloques — se regeneró el componente completo.</p>
          )}

          {/* Editor manual determinista (mismo del editor de video) */}
          {code && (
            <div className="flex items-center gap-2">
              <button
                onClick={codeHistory.undo}
                disabled={!codeHistory.canUndo}
                title="Deshacer (Ctrl+Z)"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border-tech text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo2 size={13} /> Deshacer
              </button>
              <button
                onClick={codeHistory.redo}
                disabled={!codeHistory.canRedo}
                title="Rehacer (Ctrl+Shift+Z)"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border-tech text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Redo2 size={13} /> Rehacer
              </button>
              <button
                onClick={handleFlywheel}
                title="Marcar como buena → se guarda en el flywheel (aún no se usa para generar)"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-amber-400/40 text-amber-300 hover:bg-amber-400/10 ml-auto"
              >
                <Star size={13} /> Guardar como buena
              </button>
            </div>
          )}
          {flywheelMsg && <p className="text-[11px] text-amber-300/80">⭐ {flywheelMsg}</p>}
          {code && <CodeValueEditor code={code} onChange={setCode} />}

          {/* Código editable a mano */}
          {code && (
            <details className="text-xs">
              <summary className="cursor-pointer text-text-secondary hover:text-text-primary">Ver / editar código</summary>
              <textarea
                value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
                className="mt-2 w-full h-72 bg-surface-lowest border border-border-tech rounded-lg p-3 text-text-secondary/80 font-mono text-[11px] focus:outline-none focus:border-mint-precision resize-y"
              />
            </details>
          )}
        </div>

        {/* DERECHA: preview + render */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-text-secondary mb-2">
            {meta ? `${meta.width}×${meta.height} · ${meta.duration_frames}f · ${meta.model}` : 'Preview'}
          </div>
          <div
            className="rounded-2xl overflow-hidden border border-border-tech bg-surface-lowest shadow-2xl"
            style={{ width: previewW, height: previewH }}
          >
            {compiled.Comp ? (
              <VisualEditor
                code={code}
                onChange={setCode}
                width={meta?.width ?? 1080}
                height={meta?.height ?? 1920}
                fps={meta?.fps ?? 30}
                durationInFrames={meta?.duration_frames ?? 180}
                previewW={previewW}
                previewH={previewH}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center text-text-secondary/50 text-sm p-6">
                {compiled.error ? (
                  <div className="text-red-400">
                    <AlertTriangle size={28} className="mx-auto mb-2" />
                    <div className="text-xs mt-2 font-mono">{compiled.error}</div>
                  </div>
                ) : (
                  'Tu animación aparecerá aquí'
                )}
              </div>
            )}
          </div>

          {compiled.Comp && (
            <button
              onClick={handleRender} disabled={rendering}
              className="mt-4 flex items-center justify-center gap-2 bg-surface-high border border-border-tech text-text-primary px-5 py-2.5 rounded-lg hover:border-mint-precision disabled:opacity-50 text-sm font-medium"
              style={{ width: previewW }}
            >
              {rendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
              {rendering ? 'Renderizando mp4…' : 'Renderizar a mp4'}
            </button>
          )}
          {renderError && <div className="mt-2 text-xs text-red-400 text-center" style={{ width: previewW }}>{renderError}</div>}

          {compiled.Comp && (
            <button
              onClick={handleAeExport}
              disabled={aeExporting}
              title="Exporta capas editables para After Effects (beta)"
              className="mt-2 flex items-center justify-center gap-2 bg-surface-high border border-border-tech text-text-primary px-5 py-2.5 rounded-lg hover:border-mint-precision disabled:opacity-50 text-sm font-medium"
              style={{ width: previewW }}
            >
              {aeExporting ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
              {aeExporting ? 'Muestreando para AE…' : 'Exportar AE editable (beta)'}
            </button>
          )}
          {aeError && <div className="mt-2 text-xs text-red-400 text-center" style={{ width: previewW }}>{aeError}</div>}
          {videoUrl && (
            <div className="mt-4 flex flex-col items-center gap-2" style={{ width: previewW }}>
              <video src={videoUrl} controls className="rounded-xl border border-border-tech w-full" />
              <a href={videoUrl} download="animacion.mp4" className="flex items-center gap-2 text-sm text-mint-precision hover:underline">
                <Download size={15} /> Descargar mp4
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

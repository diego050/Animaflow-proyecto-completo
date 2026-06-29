import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, Sparkles, Wand2, AlertTriangle, Loader2, Film, Download, Layers } from 'lucide-react';
import { api } from '../../api/client';
import { compileAnimation } from '../../remotion/compileAnimation';
import { CustomCode } from '../../remotion/CustomCode';
import { useAuthStore } from '../../store/useAuthStore';
import { CodeValueEditor } from '../../components/project/CodeValueEditor';
import { tagElements } from '../../remotion/aeTranslator';

interface GenResponse {
  code: string;
  valid: boolean;
  errors: string[];
  model: string;
  width: number;
  height: number;
  duration_frames: number;
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
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [modelOverride, setModelOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
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

  const callGenerate = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<GenResponse>('/api/admin/animations/generate', body, { timeoutMs: 180000 });
      setCode(data.code);
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
    callGenerate({
      prompt: prompt.trim(),
      duration_seconds: durationSeconds,
      aspect_ratio: aspectRatio,
      model: modelOverride.trim() || undefined,
    });
  }, [prompt, durationSeconds, aspectRatio, modelOverride, callGenerate]);

  const handleEdit = useCallback(() => {
    if (!editInstruction.trim() || !code) return;
    callGenerate({
      prompt: prompt.trim() || 'animación',
      duration_seconds: durationSeconds,
      model: modelOverride.trim() || undefined,
      previous_code: code,
      edit_instruction: editInstruction.trim(),
    });
    setEditInstruction('');
  }, [editInstruction, code, prompt, durationSeconds, modelOverride, callGenerate]);

  const handleRender = useCallback(async () => {
    if (!code || !meta) return;
    setRendering(true);
    setRenderError(null);
    setVideoUrl(null);
    try {
      const data = await api.post<{ video_url: string; anim_id: string }>(
        '/api/admin/animations/render',
        { code, width: meta.width, height: meta.height, duration_frames: meta.duration_frames },
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
          fps: 30,
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

  const previewH = 560;
  const previewW = meta ? Math.round((previewH * meta.width) / meta.height) : Math.round((previewH * 1080) / 1920);

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
              <label className="block text-xs font-medium text-text-secondary mb-1">Frames (30fps)</label>
              <input
                type="number" min={5} max={900} step={1} value={Math.round(durationSeconds * 30)}
                onChange={(e) => setDurationSeconds(Math.max(5, Math.min(900, Number(e.target.value) || 180)) / 30)}
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

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-mint-precision text-surface-lowest font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? 'Generando…' : 'Generar animación'}
          </button>

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

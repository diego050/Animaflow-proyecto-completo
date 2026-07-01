import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SkipForward, SkipBack, MessageSquare, Sliders } from 'lucide-react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { SceneWrapper } from '../../remotion/SceneRoot';
import { VisualEditor } from './VisualEditor';
import { MainComposition } from '../../remotion/MainComposition';
import type { TimelineSpec, Spec } from '../../types/spec';
import { SceneTimelineBar } from './SceneTimelineBar';
import { SceneInlineEditor } from './SceneInlineEditor';
import { ChatPanel } from './SceneEditor/ChatPanel';
import { editScene, type SceneEditResponse } from '../../api/sceneEdit';
import { SceneVersionHistory } from './SceneVersionHistory';
import { api } from '../../api/client';
import { useJobsStore } from '../../store/useJobsStore';
import { dimsFor } from '../../remotion/aspectDims';

interface PreviewPlayerProps {
  spec: TimelineSpec;
  jobId: string;
  isReadyToRender?: boolean;
  aspectRatio?: string;
  focusSceneIndex?: number | null;
  onClearFocus?: () => void;
  onFocusScene?: (index: number) => void;
  onSceneSpecChange?: (sceneIndex: number, updatedScene: Spec) => void;
}

export function PreviewPlayer({ spec, jobId, isReadyToRender, aspectRatio, focusSceneIndex, onClearFocus, onFocusScene, onSceneSpecChange }: PreviewPlayerProps) {
  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const sceneCount = spec.scenes.length;
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<PlayerRef>(null);

  const focusedScene = focusSceneIndex != null ? spec.scenes[focusSceneIndex] : null;

  // Key to force Player re-render when spec content changes (debounced to avoid flicker)
  const specKey = JSON.stringify(spec.scenes.map(s => ({ text: s.text, duration: s.duration_seconds, composer: s.anima_composer })));
  const [debouncedSpecKey, setDebouncedSpecKey] = useState(specKey);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSpecKey(specKey), 400);
    return () => clearTimeout(timer);
  }, [specKey]);

  // Tabbed panel state
  const [activePanel, setActivePanel] = useState<'editor' | 'chat'>('editor');

  const dims = dimsFor(aspectRatio);
  const compWidth = dims.w;
  const compHeight = dims.h;
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // Tamaño real del área de preview (para encajar el editor visual sin deformar).
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clic en el preview GLOBAL (mientras corre): detecta la escena que va reproduciéndose por el
  // frame actual, la enfoca (→ editable) y recuerda el punto del clic para AUTO-SELECCIONAR el
  // elemento en el editor. Así no hay que apretar "Escena N" en el panel.
  const [pendingSelect, setPendingSelect] = useState<{ sceneIdx: number; frame: number; fx: number; fy: number } | null>(null);
  const handlePreviewClick = useCallback(
    (e: React.MouseEvent) => {
      const p = playerRef.current;
      const boxEl = boxRef.current;
      if (!p || !boxEl) return;
      let frame = 0;
      try { frame = p.getCurrentFrame(); } catch { return; }
      // Mapea el frame global → índice de escena + frame relativo (escenas contiguas a 30fps).
      let acc = 0;
      let sceneIdx = spec.scenes.length - 1;
      let rel = 0;
      for (let i = 0; i < spec.scenes.length; i++) {
        const d = Math.max(1, Math.round((spec.scenes[i].duration_seconds || 0) * 30));
        if (frame < acc + d) { sceneIdx = i; rel = frame - acc; break; }
        acc += d;
        rel = frame - acc;
      }
      const scene = spec.scenes[sceneIdx] as Spec;
      const rect = boxEl.getBoundingClientRect();
      const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setPendingSelect(scene?.custom_code ? { sceneIdx, frame: Math.max(0, rel), fx, fy } : null);
      onFocusScene?.(sceneIdx);
    },
    [spec.scenes, onFocusScene],
  );

  // Edición visual de la escena ENFOCADA (en el preview grande): guarda su custom_code (live + debounced).
  const focusCodeSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFocusedCodeChange = useCallback(
    (newCode: string) => {
      if (focusSceneIndex == null) return;
      const sc = spec.scenes[focusSceneIndex];
      onSceneSpecChange?.(focusSceneIndex, { ...sc, custom_code: newCode } as Spec);
      if (focusCodeSave.current) clearTimeout(focusCodeSave.current);
      const idx = focusSceneIndex;
      focusCodeSave.current = setTimeout(() => {
        api.post(`/api/jobs/${jobId}/scenes/${idx}/code`, { custom_code: newCode }).catch(() => {});
      }, 600);
    },
    [focusSceneIndex, spec.scenes, onSceneSpecChange, jobId],
  );

  // Effect to handle seeking in the full video when a scene is clicked (isReadyToRender mode)
  useEffect(() => {
    if (focusSceneIndex != null && isReadyToRender && playerRef.current) {
      const scene = spec.scenes[focusSceneIndex];
      if (scene) {
        const startFrame = Math.round((scene.start_time_seconds ?? 0) * 30);
        playerRef.current.seekTo(startFrame);
      }
    }
  }, [focusSceneIndex, isReadyToRender, spec.scenes]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight') {
        if (focusSceneIndex != null && focusSceneIndex < sceneCount - 1 && onFocusScene) {
          onFocusScene(focusSceneIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (focusSceneIndex != null && focusSceneIndex > 0 && onFocusScene) {
          onFocusScene(focusSceneIndex - 1);
        }
      } else if (e.key === 'Escape') {
        if (focusSceneIndex != null && onClearFocus) {
          onClearFocus();
        }
      } else if (e.key === ' ') {
        // Toggle play/pause
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusSceneIndex, sceneCount, onFocusScene, onClearFocus]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Player side - takes remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-lowest rounded-xl border border-border-tech p-6 overflow-y-auto">
        {focusedScene && onClearFocus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-lg mb-4 flex items-center justify-between`}
          >
            <button
              onClick={onClearFocus}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-mint-precision bg-mint-precision/10 hover:bg-mint-precision/20 transition-colors"
            >
              <SkipBack size={14} />
              Volver a todas las escenas
            </button>
            <div className="flex items-center gap-2">
              <button
                disabled={focusSceneIndex === 0}
                onClick={() => onFocusScene?.(focusSceneIndex! - 1)}
                className="p-1.5 rounded bg-surface-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                title="Escena Anterior (←)"
              >
                <SkipBack size={14} />
              </button>
              <button
                disabled={focusSceneIndex === sceneCount - 1}
                onClick={() => onFocusScene?.(focusSceneIndex! + 1)}
                className="p-1.5 rounded bg-surface-elevated text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
                title="Siguiente Escena (→)"
              >
                <SkipForward size={14} />
              </button>
            </div>
          </motion.div>
        )}

        <div className="w-full flex items-center justify-center" style={{ maxHeight: 'calc(100vh - 340px)' }}>
          <div ref={boxRef} style={{ aspectRatio: dims.cssRatio }} className="w-full max-h-full bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-border-tech/50">
            {focusedScene && (focusedScene as Spec).custom_code && box.w > 0 ? (
              // Escena code-gen ENFOCADA → el preview grande es EDITABLE (clic/arrastrar) sobre su
              // custom_code. Editable AUNQUE el proyecto esté completado (para editar y re-renderizar).
              // Encaja en el área medida sin deformar.
              (() => {
                const ar = compWidth / compHeight;
                let pw = Math.round(box.h * ar);
                let ph = box.h;
                if (pw > box.w) { pw = box.w; ph = Math.round(box.w / ar); }
                return (
                  <VisualEditor
                    key={`ve-${focusSceneIndex}`}
                    code={(focusedScene as Spec).custom_code as string}
                    onChange={handleFocusedCodeChange}
                    width={compWidth}
                    height={compHeight}
                    fps={30}
                    durationInFrames={Math.round((focusedScene.duration_seconds || 5) * 30)}
                    previewW={pw}
                    previewH={ph}
                    initialSelect={pendingSelect && pendingSelect.sceneIdx === focusSceneIndex
                      ? { frame: pendingSelect.frame, fx: pendingSelect.fx, fy: pendingSelect.fy }
                      : null}
                    onInitialSelectConsumed={() => setPendingSelect(null)}
                  />
                );
              })()
            ) : isReadyToRender ? (
              /* Preview global en vivo → clic sobre una escena code-gen = editarla (overlay). */
              <div className="relative w-full h-full">
                <Player
                  key={`main-full-${debouncedSpecKey}`}
                  ref={playerRef}
                  component={MainComposition}
                  inputProps={{ spec }}
                  durationInFrames={totalDuration > 0 ? Math.round(totalDuration * 30) : 150}
                  compositionWidth={compWidth}
                  compositionHeight={compHeight}
                  fps={30}
                  controls
                  style={{ width: '100%', height: '100%' }}
                />
                <div
                  onClick={handlePreviewClick}
                  title="Clic para editar la escena que se está reproduciendo"
                  className="absolute inset-x-0 top-0 cursor-pointer"
                  style={{ bottom: 44 }}
                />
              </div>
            ) : focusedScene ? (
              /* Pre-render: scene preview (no editable, sin custom_code) */
              <Player
                key={`scene-${focusSceneIndex}-${debouncedSpecKey}`}
                component={SceneWrapper}
                inputProps={{
                  type: focusedScene.type,
                  text: focusedScene.text,
                  durationInFrames: Math.round((focusedScene.duration_seconds || 5) * 30),
                  customCode: (focusedScene as Spec).custom_code,
                  fallbackBg: String((focusedScene as Spec).remotion_props?.backgroundColor || '#000000'),
                }}
                durationInFrames={Math.round((focusedScene.duration_seconds || 5) * 30)}
                compositionWidth={compWidth}
                compositionHeight={compHeight}
                fps={30}
                controls
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              /* Preview global en vivo (pre-render) → clic sobre una escena code-gen = editarla. */
              <div className="relative w-full h-full">
                <Player
                  key={`main-fallback-${debouncedSpecKey}`}
                  ref={playerRef}
                  component={MainComposition}
                  inputProps={{ spec }}
                  durationInFrames={totalDuration > 0 ? Math.round(totalDuration * 30) : 150}
                  compositionWidth={compWidth}
                  compositionHeight={compHeight}
                  fps={30}
                  controls
                  style={{ width: '100%', height: '100%' }}
                />
                <div
                  onClick={handlePreviewClick}
                  title="Clic para editar la escena que se está reproduciendo"
                  className="absolute inset-x-0 top-0 cursor-pointer"
                  style={{ bottom: 44 }}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Timeline Bar */}
        <div className="w-full max-w-lg mt-6">
          <SceneTimelineBar spec={spec} focusSceneIndex={focusSceneIndex ?? null} onSceneClick={onFocusScene} />
        </div>

        <p className="text-text-secondary/40 text-[10px] mt-4 flex items-center gap-2">
          {focusedScene && (focusedScene as Spec).custom_code && box.w > 0
            ? `Editor visual — Escena ${focusSceneIndex! + 1} · clic para editar, arrastra para mover`
            : isReadyToRender
            ? (focusedScene != null ? `Preview en vivo · Escena ${focusSceneIndex! + 1} seleccionada` : 'Preview en vivo — el MP4 se genera al Renderizar/Descargar')
            : (focusedScene != null
              ? (focusedScene.type === 'custom' && (focusedScene as Spec)?.anima_composer
                ? `Preview en vivo — AnimaComposer · Escena ${focusSceneIndex! + 1}`
                : `Preview individual — Escena ${focusSceneIndex! + 1}`)
              : 'Selecciona una escena')}
          <span className="bg-surface-elevated px-1.5 py-0.5 rounded text-[9px]">Espacio para play/pause</span>
        </p>
      </div>

      {/* Tabbed panel - stacked on mobile, sidebar on desktop */}
      <div className="w-full lg:w-96 flex flex-col bg-surface-container border border-border-tech rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border-tech/50">
          <button
            onClick={() => setActivePanel('editor')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
              activePanel === 'editor'
                ? 'text-mint-precision border-b-2 border-mint-precision'
                : 'text-text-secondary/50 hover:text-text-primary'
            }`}
          >
            <Sliders size={14} />
            Editor
            <span className="bg-surface-elevated px-1.5 py-0.5 rounded text-[9px]">{sceneCount}</span>
          </button>
          <button
            onClick={() => setActivePanel('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-colors ${
              activePanel === 'chat'
                ? 'text-mint-precision border-b-2 border-mint-precision'
                : 'text-text-secondary/50 hover:text-text-primary'
            }`}
          >
            <MessageSquare size={14} />
            Asistente IA
            <span className="bg-surface-elevated px-1.5 py-0.5 rounded text-[9px]">{totalDuration.toFixed(1)}s</span>
          </button>
        </div>
        {/* Content */}
        {activePanel === 'editor' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[calc(100vh-300px)]">
            {spec.scenes.map((scene, idx) => (
              <SceneInlineEditor
                key={idx}
                scene={scene}
                sceneIndex={idx}
                jobId={jobId}
                isFocused={focusSceneIndex === idx}
                aspectRatio={aspectRatio}
                onSpecChange={onSceneSpecChange}
                onFocusScene={onFocusScene}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="h-[340px]">
              <ChatPanel
                onSend={async (prompt) => {
                  // Chat GLOBAL: el backend parsea a qué escena(s) te refieres y qué quieres.
                  const data = await api.post<{
                    message: string;
                    intent: string;
                    edited_scenes: number[];
                    changes?: { scene: number; before: string; after: string }[];
                    updated_spec?: TimelineSpec;
                  }>(
                    `/api/jobs/${jobId}/assistant`,
                    { prompt, focused_scene_index: focusSceneIndex ?? null },
                    { timeoutMs: 180000 },
                  );
                  if (data.updated_spec) {
                    useJobsStore.getState().applyJobSpec(data.updated_spec);
                  }
                  // Enfoca la escena editada → su historial/checkpoint aparece abajo. Y refresca el historial.
                  if (data.edited_scenes?.length) {
                    onFocusScene?.(data.edited_scenes[0]);
                    setHistoryRefresh((n) => n + 1);
                  }
                  // Muestra el diff concreto en el chat (qué línea cambió).
                  const diff = (data.changes ?? [])
                    .map((c) => `· esc ${c.scene}: «${(c.before || '').slice(0, 60)}» → «${(c.after || '').slice(0, 60)}»`)
                    .join('\n');
                  return {
                    success: true,
                    intent: data.intent === 'query' ? 'query' : 'edit',
                    answer: data.message,
                    explanation: diff ? `${data.message}\n${diff}` : data.message,
                    warnings: [],
                    changes_applied: (data.edited_scenes?.length ?? 0) > 0,
                  } as SceneEditResponse;
                }}
                disabled={false}
                jobId={jobId}
              />
            </div>
            <div className="px-3 pb-3">
              <SceneVersionHistory
                jobId={jobId}
                sceneIndex={focusSceneIndex ?? 0}
                refreshKey={historyRefresh}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

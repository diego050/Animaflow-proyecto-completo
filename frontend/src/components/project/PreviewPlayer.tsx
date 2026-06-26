import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SkipForward, SkipBack, MessageSquare, Sliders } from 'lucide-react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { SceneWrapper } from '../../remotion/SceneRoot';
import { MainComposition } from '../../remotion/MainComposition';
import type { TimelineSpec, Spec } from '../../types/spec';
import { SceneTimelineBar } from './SceneTimelineBar';
import { SceneInlineEditor } from './SceneInlineEditor';
import { ChatPanel } from './SceneEditor/ChatPanel';
import { editScene } from '../../api/sceneEdit';

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

  const isLandscape = aspectRatio === '16:9';
  const compWidth = isLandscape ? 1920 : 1080;
  const compHeight = isLandscape ? 1080 : 1920;
  const aspectClass = isLandscape ? 'aspect-[16/9]' : 'aspect-[9/16]';

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
          <div className={`w-full max-h-full ${aspectClass} bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-border-tech/50`}>
            {isReadyToRender ? (
              /* Full video with audio - seek to scene on click */
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
            ) : focusedScene ? (
              /* Pre-render: show individual scene preview (no audio yet) */
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
              <Player
                key={`main-fallback-${debouncedSpecKey}`}
                component={MainComposition}
                inputProps={{ spec }}
                durationInFrames={totalDuration > 0 ? Math.round(totalDuration * 30) : 150}
                compositionWidth={compWidth}
                compositionHeight={compHeight}
                fps={30}
                controls
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>
        </div>
        
        {/* Timeline Bar */}
        <div className="w-full max-w-lg mt-6">
          <SceneTimelineBar spec={spec} focusSceneIndex={focusSceneIndex ?? null} onSceneClick={onFocusScene} />
        </div>

        <p className="text-text-secondary/40 text-[10px] mt-4 flex items-center gap-2">
          {isReadyToRender
            ? (focusedScene != null ? `Video completo · Escena ${focusSceneIndex! + 1} seleccionada` : 'Video MP4 final')
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
              />
            ))}
          </div>
        ) : (
          <div className="h-[400px]">
            <ChatPanel
              onSend={async (prompt) => {
                const targetScene = focusSceneIndex ?? 0;
                return editScene(jobId, targetScene, {
                  mode: 'conversational',
                  prompt,
                });
              }}
              disabled={false}
              jobId={jobId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

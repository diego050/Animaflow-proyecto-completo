import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SkipForward, SkipBack, Play, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Player } from '@remotion/player';
import type { PlayerRef } from '@remotion/player';
import { SceneWrapper } from '../../remotion/SceneRoot';
import { MainComposition } from '../../remotion/MainComposition';
import type { TimelineSpec, Spec } from '../../types/spec';
import { SceneTimelineBar } from './SceneTimelineBar';
import { SceneEditor } from './SceneEditor';

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
  const [showEditor, setShowEditor] = useState(false);

  const focusedScene = focusSceneIndex != null ? spec.scenes[focusSceneIndex] : null;

  const handleSceneSpecChange = useCallback((updatedScene: Spec) => {
    if (focusSceneIndex != null && onFocusScene) {
      onSceneSpecChange?.(focusSceneIndex, updatedScene);
    }
  }, [focusSceneIndex, onFocusScene, onSceneSpecChange]);

  const isLandscape = aspectRatio === '16:9';
  const compWidth = isLandscape ? 1920 : 1080;
  const compHeight = isLandscape ? 1080 : 1920;
  const containerWidthClass = isLandscape ? 'max-w-3xl' : 'max-w-sm';
  const aspectClass = isLandscape ? 'aspect-[16/9]' : 'aspect-[9/16]';

  // Determinamos contenedor

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
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Player - centered */}
      <div className={`flex-1 flex flex-col items-center justify-center bg-surface-lowest rounded-xl border border-border-tech p-6 min-h-[400px]`}>
        {focusedScene && onClearFocus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full ${containerWidthClass} mb-4 flex items-center justify-between`}
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

        <div className={`w-full ${containerWidthClass} ${aspectClass} bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-border-tech/50`}>
          {isReadyToRender ? (
            /* Full video with audio - seek to scene on click */
            <Player
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
              component={SceneWrapper}
              inputProps={{
                type: focusedScene.type,
                text: focusedScene.text,
                durationInFrames: Math.round((focusedScene.duration_seconds || 5) * 30),
                animaComposer: (focusedScene as Spec).anima_composer,
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
        
        {/* Timeline Bar */}
        <div className={`w-full ${containerWidthClass} mt-6`}>
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

      {/* Project info sidebar - stacked on mobile, sidebar on desktop */}
      <div className="w-full lg:w-72 space-y-4">
        {/* Desktop info card (hidden on mobile) */}
        <div className="hidden lg:block bg-surface-container border border-border-tech rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Información del proyecto</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">Escenas</span>
              <span className="text-sm font-semibold text-text-primary">{sceneCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">Duración total</span>
              <span className="text-sm font-semibold text-text-primary">{totalDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">Relación de aspecto</span>
              <span className="text-sm font-semibold text-mint-precision">{aspectRatio || '9:16'}</span>
            </div>
          </div>
        </div>

        {/* Desktop scene list / editor (hidden on mobile) */}
        <div className="hidden lg:block bg-surface-container border border-border-tech rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              {showEditor && focusSceneIndex != null ? `Editor — Escena ${focusSceneIndex + 1}` : 'Escenas'}
            </h3>
            {focusSceneIndex != null && (
              <button
                onClick={() => setShowEditor(!showEditor)}
                className="p-1.5 rounded-md text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/10 transition-colors"
                title={showEditor ? 'Cerrar editor' : 'Abrir editor'}
              >
                {showEditor ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              </button>
            )}
          </div>

          {showEditor && focusSceneIndex != null ? (
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <SceneEditor
                scene={spec.scenes[focusSceneIndex]}
                sceneIndex={focusSceneIndex}
                jobId={jobId}
                onSpecChange={handleSceneSpecChange}
              />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {spec.scenes.map((scene, idx) => {
                const isFocused = focusSceneIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => onFocusScene?.(idx)}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      isFocused
                        ? 'bg-mint-precision/10 border border-mint-precision/30'
                        : 'bg-surface-lowest/50 hover:bg-surface-elevated'
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                      isFocused
                        ? 'text-deep-slate bg-mint-precision'
                        : 'text-mint-precision bg-mint-precision/10'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-text-primary truncate">{scene.text}</p>
                      <p className="text-[10px] text-text-secondary/40">{scene.duration_seconds}s</p>
                    </div>
                    {isFocused && (
                      <Play size={12} className="text-mint-precision shrink-0 mt-1 ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

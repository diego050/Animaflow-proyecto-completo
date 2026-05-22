import { motion } from 'framer-motion';
import { SkipForward, Play, ChevronDown, Video } from 'lucide-react';
import type { TimelineSpec } from '../../types/spec';
import { useAuthStore } from '../../store/useAuthStore';

interface PreviewPlayerProps {
  spec: TimelineSpec;
  jobId: string;
  isReadyToRender?: boolean;
  aspectRatio?: string;
  focusSceneIndex?: number | null;
  onClearFocus?: () => void;
}

export function PreviewPlayer({ spec, jobId, isReadyToRender, aspectRatio, focusSceneIndex, onClearFocus }: PreviewPlayerProps) {
  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const sceneCount = spec.scenes.length;
  const token = useAuthStore((state) => state.token);

  const focusedScene = focusSceneIndex != null ? spec.scenes[focusSceneIndex] : null;

  // Determinar la URL del video a mostrar
  let videoUrl = '';
  if (focusSceneIndex != null) {
    videoUrl = `/api/scenes/${jobId}/${focusSceneIndex}.mp4?token=${token}`;
  } else if (isReadyToRender) {
    videoUrl = `/api/jobs/${jobId}/video?token=${token}`;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Player - centered */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-lowest rounded-xl border border-border-tech p-6 min-h-[400px]">
        {focusedScene && onClearFocus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mb-4"
          >
            <button
              onClick={onClearFocus}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-mint-precision bg-mint-precision/10 hover:bg-mint-precision/20 transition-colors"
            >
              <SkipForward size={14} />
              Volver a todas las escenas
            </button>
            <p className="text-text-secondary/50 text-xs mt-1.5">
              Preview: Escena {focusSceneIndex! + 1} · {focusedScene.duration_seconds}s
            </p>
          </motion.div>
        )}

        <div className="w-full max-w-sm aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-border-tech/50">
          {videoUrl ? (
            <video
              key={videoUrl} // Forzar recarga al cambiar URL
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
              controlsList="nodownload"
            />
          ) : (
            <div className="text-center p-6">
              <Video className="w-12 h-12 text-text-secondary/30 mx-auto mb-3" />
              <p className="text-text-secondary/60 text-sm">
                Selecciona una escena de la lista para ver su preview.
              </p>
              <p className="text-text-secondary/40 text-xs mt-2">
                El video final estará disponible aquí una vez renderizado.
              </p>
            </div>
          )}
        </div>
        <p className="text-text-secondary/40 text-xs mt-4">
          {focusedScene
            ? `Preview MP4 individual — Escena ${focusSceneIndex! + 1}`
            : isReadyToRender 
              ? 'Video MP4 final'
              : 'Selecciona una escena'}
        </p>
      </div>

      {/* Project info sidebar - stacked on mobile, sidebar on desktop */}
      <div className="w-full lg:w-72 space-y-4">
        {/* Collapsible info on mobile */}
        <div className="lg:hidden">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-surface-container border border-border-tech rounded-xl text-sm font-semibold text-text-primary list-none">
              <span>Información del proyecto</span>
              <ChevronDown size={16} className="text-text-secondary/50 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 bg-surface-container border border-border-tech rounded-xl p-5 space-y-3">
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
          </details>
        </div>

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

        {/* Scene list - collapsible on mobile */}
        <div className="lg:hidden">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-4 bg-surface-container border border-border-tech rounded-xl text-sm font-semibold text-text-primary list-none">
              <span>Escenas ({sceneCount})</span>
              <ChevronDown size={16} className="text-text-secondary/50 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 bg-surface-container border border-border-tech rounded-xl p-5">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {spec.scenes.map((scene, idx) => {
                  const isFocused = focusSceneIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (onClearFocus && isFocused) onClearFocus();
                        else if (onClearFocus) {
                           // This requires onPreviewScene, but it's not passed. 
                           // Actually, let's keep the view-only nature of this list since we just highlight.
                        }
                      }}
                      className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                        isFocused
                          ? 'bg-mint-precision/10 border border-mint-precision/30'
                          : 'bg-surface-lowest/50'
                      }`}
                    >
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                        isFocused
                          ? 'text-deep-slate bg-mint-precision'
                          : 'text-mint-precision bg-mint-precision/10'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-text-primary truncate">{scene.text}</p>
                        <p className="text-[10px] text-text-secondary/40">{scene.duration_seconds}s</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </div>

        {/* Desktop scene list (hidden on mobile) */}
        <div className="hidden lg:block bg-surface-container border border-border-tech rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Escenas</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {spec.scenes.map((scene, idx) => {
              const isFocused = focusSceneIndex === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                    isFocused
                      ? 'bg-mint-precision/10 border border-mint-precision/30'
                      : 'bg-surface-lowest/50'
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
                    <Play size={12} className="text-mint-precision shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

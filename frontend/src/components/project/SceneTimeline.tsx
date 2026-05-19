import { Layers, Clock, Monitor } from 'lucide-react';
import type { TimelineSpec } from '../../types/job';
import { SceneEditorCard } from './SceneEditorCard';

interface SceneTimelineProps {
  spec: TimelineSpec;
  jobId: string;
  onRegenerateScene: (index: number, mediaQuery: string, text: string) => Promise<void>;
  onPreviewScene: (index: number) => void;
  selectedScenes?: Set<number>;
  onToggleSceneSelection?: (index: number) => void;
}

export function SceneTimeline({ spec, jobId, onRegenerateScene, onPreviewScene, selectedScenes, onToggleSceneSelection }: SceneTimelineProps) {
  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Script header */}
      <div className="bg-surface-container border border-border-tech rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Guión completo</h3>
        <p className="text-text-secondary/80 text-sm leading-relaxed whitespace-pre-wrap font-body">
          {spec.scenes.map((s) => s.text).join('\n\n')}
        </p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-tech/50">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary/50">
            <Layers size={14} />
            {spec.scenes.length} escenas
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-secondary/50">
            <Clock size={14} />
            {totalDuration.toFixed(1)}s total
          </span>
          {spec.aspect_ratio && (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary/50">
              <Monitor size={14} />
              {spec.aspect_ratio}
            </span>
          )}
        </div>
      </div>

      {/* Scene breakdown with inline editors */}
      <h3 className="text-sm font-semibold text-text-primary mt-6 mb-2">Desglose por escenas</h3>
      <div className="space-y-3">
        {spec.scenes.map((scene, idx) => (
          <SceneEditorCard
            key={idx}
            scene={scene}
            index={idx}
            jobId={jobId}
            onRegenerate={onRegenerateScene}
            onPreview={onPreviewScene}
            isSelected={selectedScenes?.has(idx)}
            onToggleSelection={onToggleSceneSelection}
          />
        ))}
      </div>
    </div>
  );
}

import { Layers, Clock, Monitor } from 'lucide-react';
import type { TimelineSpec, Spec } from '../../types/spec';
import { SceneEditorCard } from './SceneEditorCard';

interface SceneTimelineProps {
  spec: TimelineSpec;
  jobId: string;
  onRegenerateScene: (index: number, mediaQuery: string, text: string) => Promise<void>;
  onPreviewScene: (index: number) => void;
  selectedScenes?: Set<number>;
  onToggleSceneSelection?: (index: number) => void;
  isSegmented?: boolean;
  onSpecChange?: (newSpec: TimelineSpec) => void;
}

export function SceneTimeline({
  spec,
  jobId,
  onRegenerateScene,
  onPreviewScene,
  selectedScenes,
  onToggleSceneSelection,
  isSegmented = false,
  onSpecChange,
}: SceneTimelineProps) {
  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);

  const handleSplitScene = (index: number) => {
    const scene = spec.scenes[index];
    const words = scene.text.split(' ');
    const mid = Math.ceil(words.length / 2);
    const text1 = words.slice(0, mid).join(' ');
    const text2 = words.slice(mid).join(' ');

    const halfDuration = (scene.duration_seconds ?? 0) / 2;
    const halfEstimated = scene.estimated_duration ? scene.estimated_duration / 2 : undefined;

    const newScenes: Spec[] = [...spec.scenes];
    newScenes.splice(index, 1,
      {
        ...scene,
        text: text1,
        duration_seconds: halfDuration,
        ...(halfEstimated !== undefined && { estimated_duration: halfEstimated }),
      },
      {
        ...scene,
        text: text2,
        duration_seconds: halfDuration,
        start_time_seconds: scene.start_time_seconds + halfDuration,
        ...(halfEstimated !== undefined && { estimated_duration: halfEstimated }),
      }
    );

    onSpecChange?.({ ...spec, scenes: newScenes });
  };

  const handleMergeScene = (index: number) => {
    if (index >= spec.scenes.length - 1) return;
    const scene1 = spec.scenes[index];
    const scene2 = spec.scenes[index + 1];

    const combinedDuration = (scene1.duration_seconds ?? 0) + (scene2.duration_seconds ?? 0);
    const combinedEstimated = scene1.estimated_duration && scene2.estimated_duration
      ? scene1.estimated_duration + scene2.estimated_duration
      : undefined;

    const newScenes: Spec[] = [...spec.scenes];
    newScenes.splice(index, 2, {
      ...scene1,
      text: `${scene1.text} ${scene2.text}`,
      media_query: scene1.media_query,
      duration_seconds: combinedDuration,
      ...(combinedEstimated !== undefined && { estimated_duration: combinedEstimated }),
    });

    onSpecChange?.({ ...spec, scenes: newScenes });
  };

  const handleSegmentedChange = (index: number, field: 'text' | 'media_query', value: string) => {
    const newScenes = [...spec.scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    onSpecChange?.({ ...spec, scenes: newScenes });
  };

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
            totalScenes={spec.scenes.length}
            jobId={jobId}
            onRegenerate={onRegenerateScene}
            onPreview={onPreviewScene}
            isSelected={selectedScenes?.has(idx)}
            onToggleSelection={onToggleSceneSelection}
            isSegmented={isSegmented}
            onSplitScene={isSegmented ? handleSplitScene : undefined}
            onMergeScene={isSegmented ? handleMergeScene : undefined}
            onSegmentedChange={isSegmented ? handleSegmentedChange : undefined}
          />
        ))}
      </div>
    </div>
  );
}

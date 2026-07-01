import { useState } from 'react';
import { Layers, Clock, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TimelineSpec, Spec } from '../../types/spec';
import { SceneEditorCard } from './SceneEditorCard';
import { SceneTimelineBar } from './SceneTimelineBar';

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
  const [focusSceneIndex, setFocusSceneIndex] = useState<number | null>(null);

  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);

  const handleSceneClick = (index: number) => {
    setFocusSceneIndex(index);
    // Scroll to the scene card
    const card = document.getElementById(`scene-card-${index}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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

      {/* Barra de línea de tiempo: solo cuando ya NO estás aprobando escenas (evita ruido en la
          vista "dividido por escenas"). */}
      {!isSegmented && (
        <SceneTimelineBar
          spec={spec}
          jobId={jobId}
          focusSceneIndex={focusSceneIndex}
          onSceneClick={handleSceneClick}
        />
      )}

      {/* Scene breakdown header */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Layers size={16} className="text-mint-precision/70" />
          Desglose por escenas
        </h3>
      </div>

      {/* Scene cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {spec.scenes.map((scene, idx) => (
          <motion.div
            key={idx}
            id={`scene-card-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
          >
            <SceneEditorCard
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}

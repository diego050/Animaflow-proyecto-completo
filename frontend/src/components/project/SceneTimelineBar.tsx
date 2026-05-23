import React from 'react';
import type { TimelineSpec } from '../../types/spec';

interface SceneTimelineBarProps {
  spec: TimelineSpec;
  focusSceneIndex: number | null;
  onSceneClick?: (index: number) => void;
}

export function SceneTimelineBar({ spec, focusSceneIndex, onSceneClick }: SceneTimelineBarProps) {
  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);

  if (totalDuration === 0) return null;

  return (
    <div className="w-full mt-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-primary">Línea de tiempo</span>
        <span className="text-xs text-text-secondary/60">{totalDuration.toFixed(1)}s</span>
      </div>
      
      <div className="flex w-full h-3 bg-surface-container rounded-full overflow-hidden border border-border-tech gap-px">
        {spec.scenes.map((scene, idx) => {
          const duration = scene.duration_seconds ?? 0;
          const percentage = (duration / totalDuration) * 100;
          const isFocused = focusSceneIndex === idx;

          return (
            <div
              key={idx}
              onClick={() => onSceneClick?.(idx)}
              className={`h-full transition-colors cursor-pointer hover:opacity-80 ${
                isFocused 
                  ? 'bg-mint-precision' 
                  : 'bg-surface-elevated hover:bg-mint-precision/50'
              }`}
              style={{ width: `${percentage}%` }}
              title={`Escena ${idx + 1}: ${duration}s`}
            />
          );
        })}
      </div>
      
      {/* Legend / Info */}
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] text-text-secondary/40">Inicio</span>
        <span className="text-[10px] text-text-secondary/40">Fin</span>
      </div>
    </div>
  );
}

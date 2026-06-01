import React, { useState, useRef, useMemo } from 'react';
import { Play, Pause, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TimelineSpec } from '../../types/spec';

interface SceneTimelineBarProps {
  spec: TimelineSpec;
  jobId: string;
  focusSceneIndex: number | null;
  onSceneClick?: (index: number) => void;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  currentTime?: number;
}

const MIN_SEGMENT_WIDTH_PX = 40;
const ZOOM_LEVELS = [0.5, 1, 1.5, 2] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSegmentContent(
  sceneIndex: number,
  duration: number,
  text: string,
  widthPx: number
): React.ReactNode {
  if (widthPx < 60) {
    return <span className="text-[10px] font-mono font-bold">{sceneIndex + 1}</span>;
  }
  if (widthPx < 120) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-mono font-bold">Escena {sceneIndex + 1}</span>
        <span className="text-[9px] font-mono text-text-secondary/70">{duration.toFixed(1)}s</span>
      </div>
    );
  }
  const truncatedText = text.length > 30 ? text.slice(0, 30) + '…' : text;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-mono font-bold">Escena {sceneIndex + 1}</span>
      <span className="text-[9px] font-mono text-text-secondary/70">{duration.toFixed(1)}s</span>
      <span className="text-[8px] text-text-secondary/50 truncate max-w-full">{truncatedText}</span>
    </div>
  );
}

export function SceneTimelineBar({
  spec,
  jobId: _jobId,
  focusSceneIndex,
  onSceneClick,
  isPlaying = false,
  onPlayToggle,
  currentTime = 0,
}: SceneTimelineBarProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalDuration = useMemo(
    () => spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0),
    [spec.scenes]
  );

  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const interval = 7;
    for (let t = 0; t <= totalDuration; t += interval) {
      markers.push(t);
    }
    if (markers[markers.length - 1] < totalDuration) {
      markers.push(totalDuration);
    }
    return markers;
  }, [totalDuration]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : prev;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const idx = ZOOM_LEVELS.indexOf(prev);
      return idx > 0 ? ZOOM_LEVELS[idx - 1] : prev;
    });
  };

  if (totalDuration === 0 || spec.scenes.length === 0) return null;

  const scaledWidth = 100 * zoomLevel;

  return (
    <div className="w-full mt-6">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {onPlayToggle && (
            <button
              onClick={onPlayToggle}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-high border border-border-tech text-text-secondary hover:text-mint-precision hover:border-mint-precision/50 transition-colors"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          )}
          <span className="text-xs font-semibold text-text-primary">Línea de tiempo</span>
          {currentTime > 0 && (
            <span className="text-[10px] font-mono text-cadmium-orange bg-cadmium-orange/10 px-1.5 py-0.5 rounded">
              {formatTime(currentTime)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-secondary/50">{totalDuration.toFixed(1)}s</span>
          <button
            onClick={handleZoomOut}
            className="flex items-center justify-center w-6 h-6 rounded bg-surface-high border border-border-tech text-text-secondary/60 hover:text-text-primary transition-colors"
            aria-label="Alejar zoom"
          >
            <ZoomOut size={12} />
          </button>
          <button
            onClick={handleZoomIn}
            className="flex items-center justify-center w-6 h-6 rounded bg-surface-high border border-border-tech text-text-secondary/60 hover:text-text-primary transition-colors"
            aria-label="Acercar zoom"
          >
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      {/* Timeline container */}
      <div className="relative bg-surface-container border border-border-tech rounded-xl overflow-hidden">
        {/* Time markers */}
        <div className="relative overflow-x-auto" ref={timelineRef}>
          <div style={{ minWidth: `${scaledWidth}%` }} className="relative">
            {/* Time ruler */}
            <div className="relative h-5 px-2 pt-1">
              {timeMarkers.map((t) => {
                const leftPercent = (t / totalDuration) * 100;
                return (
                  <div
                    key={t}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <span className="text-[9px] font-mono text-text-secondary/40">
                      {formatTime(t)}
                    </span>
                    <div className="w-px h-2 bg-border-tech/30 mt-0.5" />
                  </div>
                );
              })}
            </div>

            {/* Scene segments bar */}
            <div className="relative h-12 mx-2 mb-2 flex rounded-lg overflow-hidden border border-border-tech/50">
              {spec.scenes.map((scene, idx) => {
                const duration = scene.duration_seconds ?? 0;
                const percentage = (duration / totalDuration) * 100;
                const isFocused = focusSceneIndex === idx;
                const isOdd = idx % 2 === 0;

                return (
                  <motion.div
                    key={idx}
                    onClick={() => onSceneClick?.(idx)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                      isFocused
                        ? 'bg-mint-precision/30 border-t-2 border-t-mint-precision'
                        : isOdd
                          ? 'bg-mint-precision/10 hover:bg-mint-precision/20'
                          : 'bg-surface-high hover:bg-mint-precision/20'
                    } ${idx < spec.scenes.length - 1 ? 'border-r border-border-tech/50' : ''}`}
                    style={{ width: `${percentage}%` }}
                    whileHover={{ opacity: 0.85 }}
                    whileTap={{ scale: 0.98 }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Escena ${idx + 1}, ${duration.toFixed(1)} segundos`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSceneClick?.(idx);
                      }
                    }}
                  >
                    {isFocused && (
                      <div className="absolute inset-0 shadow-[0_0_8px_rgba(0,255,171,0.15)] pointer-events-none" />
                    )}
                    {getSegmentContent(idx, duration, scene.text, (percentage / 100) * 600 * zoomLevel)}
                  </motion.div>
                );
              })}
            </div>

            {/* Current time indicator */}
            {currentTime > 0 && currentTime <= totalDuration && (
              <div
                className="absolute top-5 h-14 w-px bg-cadmium-orange pointer-events-none z-10"
                style={{
                  left: `calc(8px + ${(currentTime / totalDuration) * 100}% * ${zoomLevel})`,
                }}
              >
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cadmium-orange" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scene labels row */}
      <div className="mt-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-1">
          {spec.scenes.map((scene, idx) => {
            const duration = scene.duration_seconds ?? 0;
            const isActive = focusSceneIndex === idx;

            return (
              <motion.button
                key={idx}
                onClick={() => onSceneClick?.(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'text-mint-precision font-semibold bg-mint-precision/10 border-mint-precision/30'
                    : 'text-text-secondary/50 hover:text-text-primary bg-surface-high/50 border-border-tech/30 hover:border-border-tech/60'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isActive
                      ? 'bg-mint-precision text-deep-slate'
                      : 'bg-surface-elevated text-text-secondary/60'
                  }`}
                >
                  {idx + 1}
                </span>
                <span>Escena {idx + 1}</span>
                <span className="text-text-secondary/40">·</span>
                <span className="text-text-secondary/40">{duration.toFixed(1)}s</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

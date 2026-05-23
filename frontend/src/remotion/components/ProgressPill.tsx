import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface ProgressPillProps extends UniversalProps {
  startPercent?: number;
  endPercent?: number;
  barColor?: string;
  trackColor?: string;
  duration?: number;
  showLabel?: boolean;
}

export const ProgressPill: React.FC<ProgressPillProps> = ({
  startPercent = 0,
  endPercent = 100,
  barColor = '#3b82f6',
  trackColor = '#e2e8f0',
  duration = 60,
  showLabel = true,
  textColor = '#0f172a',
  x = 540,
  y = 540,
  width = 600,
  height = 40,
  fontSize = 24,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Progress interpolation
  const currentPercent = interpolate(
    adjustedFrame,
    [15, 15 + duration], // Wait 15 frames after entrance before starting
    [startPercent, endPercent],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        zIndex: 55,
      }}
    >
      {/* The Pill Track */}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: trackColor,
          borderRadius: `${height / 2}px`,
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {/* The Pill Fill */}
        <div
          style={{
            height: '100%',
            width: `${currentPercent}%`,
            backgroundColor: barColor,
            borderRadius: `${height / 2}px`,
            transition: 'width 0.1s ease-out', // Smooth micro-updates
          }}
        />
      </div>
      
      {/* Label */}
      {showLabel && (
        <div style={{
          color: textColor,
          fontSize: `${fontSize}px`,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
        }}>
          {Math.round(currentPercent)}%
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface AudioSpectrumBarsProps extends UniversalProps {
  barCount?: number;
  barWidth?: number;
  speed?: number;
  maxHeight?: number;
  gap?: number;
}

export const AudioSpectrumBars: React.FC<AudioSpectrumBarsProps> = ({
  barCount = 15,
  barWidth = 12,
  speed = 1,
  maxHeight = 150,
  gap = 8,
  color = '#10b981',
  x = 540,
  y = 800,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // We simulate audio peaks using Math.sin and frame to look like a pseudo-random equalizer
  const bars = Array.from({ length: barCount }).map((_, i) => {
    // Generate pseudo-random height based on index and frame
    const baseFreq = i * 0.3;
    const timeFreq = (adjustedFrame * speed) * 0.1;
    // Combine multiple sine waves for chaotic natural look
    const val = Math.sin(baseFreq + timeFreq) * Math.sin(baseFreq * 2 - timeFreq * 1.5) * Math.cos(timeFreq + i);
    // Normalize to 0-1 and give base height
    const heightMult = 0.2 + (Math.abs(val) * 0.8);
    const height = heightMult * maxHeight;
    
    return (
      <div key={i} style={{ width: `${barWidth}px`, height: `${height}px`, backgroundColor: color, borderRadius: `${barWidth/2}px`, transformOrigin: 'bottom', opacity: adjustedFrame > 0 ? 1 : 0 }} />
    );
  });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -100%)', display: 'flex', alignItems: 'flex-end', gap: `${gap}px`, zIndex: 30 }}>
      {bars}
    </div>
  );
};

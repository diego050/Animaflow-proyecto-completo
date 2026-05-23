import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";

interface SoundWaveCircleProps extends UniversalProps {
  rings?: number;
  speed?: number;
}

export const SoundWaveCircle: React.FC<SoundWaveCircleProps> = ({
  rings = 4,
  speed = 1,
  color = '#f43f5e',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  
  if (adjustedFrame === 0) return null;

  const circles = Array.from({ length: rings }).map((_, i) => {
    // Phase shift each ring so they expand outward
    const phase = i * (60 / speed); // 60 frames between pulses
    const currentPhaseTime = (adjustedFrame + phase) % (60 * rings / speed);
    
    // Scale goes from 0 to 1 over the cycle
    const progress = currentPhaseTime / (60 * rings / speed);
    const scale = progress * 3; // expands to 3x size
    
    // Opacity fades out as it expands
    const opacity = (1 - progress) * 0.8;
    
    return (
      <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${scale})`, width: '200px', height: '200px', borderRadius: '50%', border: `4px solid ${color}`, opacity: opacity, zIndex: 1 }} />
    );
  });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: '200px', height: '200px', zIndex: 20 }}>
      {/* Center dot */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 20px ${color}`, zIndex: 2 }} />
      {circles}
    </div>
  );
};

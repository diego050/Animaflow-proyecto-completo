import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// LightLeakTransition — Warm gradient overlay that sweeps across the screen.
// No AnimaComposer rendering — pure visual effect driven by progress (0→1).
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string; // ignorado (look cálido fijo), por consistencia de tipos
}

export const LightLeakTransition: React.FC<Props> = ({ progress }) => {
  // Light leak sweeps from left to right
  const leakPosition = interpolate(progress, [0, 1], [-0.3, 1.3], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  const intensity = Math.sin(progress * Math.PI); // 0→1→0 curve

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Warm light sweep */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${leakPosition * 100}%`,
          width: '60%',
          height: '100%',
          background: `linear-gradient(90deg, 
            transparent 0%, 
            rgba(255, 200, 100, ${intensity * 0.6}) 30%, 
            rgba(255, 255, 220, ${intensity * 0.8}) 50%, 
            rgba(255, 200, 100, ${intensity * 0.6}) 70%, 
            transparent 100%)`,
          filter: 'blur(40px)',
          transform: 'translateX(-50%)',
        }}
      />
      {/* White flash at peak */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(255, 255, 255, ${intensity * 0.15})`,
        }}
      />
    </div>
  );
};

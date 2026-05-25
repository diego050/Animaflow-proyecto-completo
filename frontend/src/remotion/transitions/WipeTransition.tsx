import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// WipeTransition — Directional wipe effect (left-to-right).
// No AnimaComposer rendering — uses clip-path animation to reveal
// the target scene. Pure visual effect driven by progress (0→1).
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
}

export const WipeTransition: React.FC<Props> = ({ progress }) => {
  // Wipe reveals from left to right
  const wipePercentage = interpolate(progress, [0, 1], [0, 100], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  // Edge glow for polish
  const edgeGlow = Math.sin(progress * Math.PI) * 0.5;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* Wipe edge glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${wipePercentage}%`,
          width: '4px',
          height: '100%',
          backgroundColor: `rgba(255, 255, 255, ${edgeGlow})`,
          filter: 'blur(2px)',
          boxShadow: `0 0 20px rgba(255, 255, 255, ${edgeGlow * 0.5})`,
        }}
      />

      {/* Wipe overlay — covers the "from" scene as it progresses */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${wipePercentage}%`,
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 1)',
        }}
      />
    </div>
  );
};

import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// GlitchTransition — Pure visual glitch effect.
// No AnimaComposer rendering — uses RGB channel separation, horizontal
// slice offsets, and noise overlay driven by progress (0→1).
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string; // ignorado (efecto estilizado RGB), por consistencia de tipos
}

export const GlitchTransition: React.FC<Props> = ({ progress }) => {
  // Glitch intensity peaks in the middle
  const intensity = Math.sin(progress * Math.PI);

  // Random-looking but deterministic offsets based on progress
  const offset1 = Math.sin(progress * 37.7) * 20 * intensity;
  const offset2 = Math.cos(progress * 53.3) * 15 * intensity;
  const offset3 = Math.sin(progress * 71.1) * 10 * intensity;

  // Noise opacity peaks mid-transition
  const noiseOpacity = intensity * 0.4;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* RGB channel separation layers */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(255, 0, 0, ${intensity * 0.15})`,
          transform: `translateX(${offset1}px)`,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0, 255, 0, ${intensity * 0.1})`,
          transform: `translateX(${offset2}px)`,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0, 0, 255, ${intensity * 0.15})`,
          transform: `translateX(${offset3}px)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* Horizontal glitch slices */}
      {Array.from({ length: 6 }).map((_, i) => {
        const sliceY = (i / 6) * 100;
        const sliceOffset = Math.sin(progress * (23 + i * 17)) * 30 * intensity;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${sliceY}%`,
              left: 0,
              right: 0,
              height: `${100 / 6}%`,
              backgroundColor: `rgba(255, 255, 255, ${intensity * 0.08})`,
              transform: `translateX(${sliceOffset}px)`,
            }}
          />
        );
      })}

      {/* Noise overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: noiseOpacity,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          mixBlendMode: 'overlay',
        }}
      />

      {/* White flash at peak */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(255, 255, 255, ${intensity * 0.1})`,
        }}
      />
    </div>
  );
};

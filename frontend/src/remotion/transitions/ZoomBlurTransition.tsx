import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// ZoomBlurTransition — Pure visual zoom + blur effect.
// No AnimaComposer rendering — the zoom/blur is applied to a solid
// background that matches the transition's visual intent.
//
// Progress 0.0 → 1.0:
//   - Scale 1→3, blur 0→20px, opacity 1→0
//   - Dark overlay fades in to cover the outgoing scene
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
}

export const ZoomBlurTransition: React.FC<Props> = ({ progress }) => {
  const scale = interpolate(progress, [0, 1], [1, 3]);
  const blur = interpolate(progress, [0, 1], [0, 20]);
  const opacity = interpolate(progress, [0, 0.7], [1, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* Zooming blurred overlay */}
      <div
        style={{
          position: 'absolute',
          inset: '-50%',
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          opacity,
          willChange: 'transform, opacity, filter',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, rgba(0,0,0,0.8) 100%)',
        }}
      />
      {/* Fade-to-black overlay that takes over as zoom completes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0, 0, 0, ${interpolate(progress, [0.5, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
        }}
      />
    </div>
  );
};

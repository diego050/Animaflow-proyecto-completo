import React from 'react';
import { interpolate } from 'remotion';
import { AnimaComposer } from '../composer/AnimaComposer';
import type { AnimaBackground, AnimaLayer, AnimaComposerSpec } from '../../types/spec';

// ---------------------------------------------------------------------------
// ZoomBlurTransition — Zooms out the outgoing scene with increasing blur
// while the incoming scene fades in underneath.
//
// Progress 0.0 → 1.0:
//   - From scene: scale 1→3, blur 0→20px, opacity 1→0 (fades out at 0.7)
//   - To scene:   opacity 0→1 (starts fading in at 0.3)
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  fromLayers: AnimaLayer[];
  toLayers: AnimaLayer[];
  fromBackground: AnimaBackground;
  toBackground: AnimaBackground;
}

export const ZoomBlurTransition: React.FC<Props> = ({
  progress,
  fromLayers,
  toLayers,
  fromBackground,
  toBackground,
}) => {
  const scale = interpolate(progress, [0, 1], [1, 3]);
  const blur = interpolate(progress, [0, 1], [0, 20]);
  const opacityFrom = interpolate(progress, [0, 0.7], [1, 0], {
    extrapolateRight: 'clamp',
  });
  const opacityTo = interpolate(progress, [0.3, 1], [0, 1], {
    extrapolateLeft: 'clamp',
  });

  const fromSpec: AnimaComposerSpec = {
    background: fromBackground,
    layers: fromLayers,
  };

  const toSpec: AnimaComposerSpec = {
    background: toBackground,
    layers: toLayers,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* From Scene — zooming out + blurring + fading */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          opacity: opacityFrom,
          willChange: 'transform, opacity, filter',
        }}
      >
        <AnimaComposer spec={fromSpec} />
      </div>

      {/* To Scene — fading in */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: opacityTo,
          willChange: 'opacity',
        }}
      >
        <AnimaComposer spec={toSpec} />
      </div>
    </div>
  );
};

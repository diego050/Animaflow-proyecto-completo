import React from 'react';
import { interpolate } from 'remotion';
import { AnimaComposer } from '../composer/AnimaComposer';
import type { AnimaBackground, AnimaLayer, AnimaComposerSpec } from '../../types/spec';

// ---------------------------------------------------------------------------
// GradientOverlay — Stub: simple cross-fade.
// TODO: Implement a gradient overlay that transitions between the two
// scene backgrounds with a smooth color interpolation.
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  fromLayers: AnimaLayer[];
  toLayers: AnimaLayer[];
  fromBackground: AnimaBackground;
  toBackground: AnimaBackground;
}

export const GradientOverlay: React.FC<Props> = ({
  progress,
  fromLayers,
  toLayers,
  fromBackground,
  toBackground,
}) => {
  const opacityFrom = interpolate(progress, [0, 1], [1, 0], {
    extrapolateRight: 'clamp',
  });
  const opacityTo = interpolate(progress, [0, 1], [0, 1], {
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: opacityFrom,
        }}
      >
        <AnimaComposer spec={fromSpec} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: opacityTo,
        }}
      >
        <AnimaComposer spec={toSpec} />
      </div>
    </div>
  );
};

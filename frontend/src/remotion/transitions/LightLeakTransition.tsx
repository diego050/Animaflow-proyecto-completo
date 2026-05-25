import React from 'react';
import { interpolate } from 'remotion';
import { AnimaComposer } from '../composer/AnimaComposer';
import type { AnimaBackground, AnimaLayer, AnimaComposerSpec } from '../../types/spec';

// ---------------------------------------------------------------------------
// LightLeakTransition — Stub: simple cross-fade.
// TODO: Implement light leak effect using a warm gradient overlay that
// sweeps across the screen with additive blending.
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  fromLayers: AnimaLayer[];
  toLayers: AnimaLayer[];
  fromBackground: AnimaBackground;
  toBackground: AnimaBackground;
}

export const LightLeakTransition: React.FC<Props> = ({
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

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ZoomBlurTransition } from './ZoomBlurTransition';
import { WipeTransition } from './WipeTransition';
import { LightLeakTransition } from './LightLeakTransition';
import { GlitchTransition } from './GlitchTransition';
import { GradientOverlay } from './GradientOverlay';
import type { AnimaComposerSpec } from '../../types/spec';

export { ZoomBlurTransition } from './ZoomBlurTransition';
export { WipeTransition } from './WipeTransition';
export { LightLeakTransition } from './LightLeakTransition';
export { GlitchTransition } from './GlitchTransition';
export { GradientOverlay } from './GradientOverlay';

// ---------------------------------------------------------------------------
// TransitionWrapper — Declarative transition between two scenes.
//
// Receives the spec of the outgoing scene and the incoming scene, maps the
// transition type to the appropriate component, and drives the animation
// via a normalized progress value (0 → 1).
// ---------------------------------------------------------------------------

interface TransitionWrapperProps {
  fromSpec: AnimaComposerSpec;
  toSpec: AnimaComposerSpec;
  type: string;
  durationFrames: number;
}

const TRANSITION_MAP: Record<
  string,
  React.ComponentType<{
    progress: number;
    fromLayers: AnimaComposerSpec['layers'];
    toLayers: AnimaComposerSpec['layers'];
    fromBackground: AnimaComposerSpec['background'];
    toBackground: AnimaComposerSpec['background'];
  }>
> = {
  ZoomBlurTransition,
  WipeTransition,
  LightLeakTransition,
  GlitchTransition,
  GradientOverlay,
};

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  fromSpec,
  toSpec,
  type,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationFrames;

  const TransitionComponent = TRANSITION_MAP[type];

  if (!TransitionComponent) {
    // Fallback: no transition — render the target scene directly
    return null;
  }

  return (
    <TransitionComponent
      progress={progress}
      fromLayers={fromSpec.layers}
      toLayers={toSpec.layers}
      fromBackground={fromSpec.background}
      toBackground={toSpec.background}
    />
  );
};

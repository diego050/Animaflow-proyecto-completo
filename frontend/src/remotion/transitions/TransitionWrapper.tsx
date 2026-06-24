import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ZoomBlurTransition } from './ZoomBlurTransition';
import { WipeTransition } from './WipeTransition';
import { LightLeakTransition } from './LightLeakTransition';
import { GlitchTransition } from './GlitchTransition';
import { GradientOverlay } from './GradientOverlay';
import { FadeThroughBlack } from './FadeThroughBlack';
import { FrostedGlassWipe } from './FrostedGlassWipe';
import { GridPixelateWipe } from './GridPixelateWipe';
import { ChromaticAberrationWipe } from './ChromaticAberrationWipe';
import { WhipPanTransition } from './WhipPanTransition';
import { SlideWipe } from './SlideWipe';
import { IrisTransition } from './IrisTransition';

export { ZoomBlurTransition } from './ZoomBlurTransition';
export { WipeTransition } from './WipeTransition';
export { LightLeakTransition } from './LightLeakTransition';
export { GlitchTransition } from './GlitchTransition';
export { GradientOverlay } from './GradientOverlay';
export { FadeThroughBlack } from './FadeThroughBlack';
export { FrostedGlassWipe } from './FrostedGlassWipe';
export { GridPixelateWipe } from './GridPixelateWipe';
export { ChromaticAberrationWipe } from './ChromaticAberrationWipe';
export { WhipPanTransition } from './WhipPanTransition';
export { SlideWipe } from './SlideWipe';
export { IrisTransition } from './IrisTransition';

// ---------------------------------------------------------------------------
// TransitionWrapper — Declarative transition between two scenes.
//
// Receives the spec of the outgoing scene and the incoming scene, maps the
// transition type to the appropriate component, and drives the animation
// via a normalized progress value (0 → 1).
//
// NOTE: Transitions are now pure visual effects (overlays, gradients, blurs,
// wipes) that do NOT render full scenes. They only receive `progress`.
// ---------------------------------------------------------------------------

export interface TransitionParams {
  [key: string]: unknown;
}

interface TransitionWrapperProps {
  type: string;
  durationFrames: number;
  /** Color del velo/barrido (las atómicas: Fade/Wipe/ZoomBlur). */
  color?: string;
  /** Parámetros atómicos opcionales (dirección, blur, etc.) por transición. */
  params?: TransitionParams;
}

const TRANSITION_MAP: Record<
  string,
  React.ComponentType<{ progress: number; color?: string; params?: TransitionParams }>
> = {
  ZoomBlurTransition,
  WipeTransition,
  LightLeakTransition,
  GlitchTransition,
  GradientOverlay,
  FadeThroughBlack,
  FrostedGlassWipe,
  GridPixelateWipe,
  ChromaticAberrationWipe,
  WhipPanTransition,
  SlideWipe,
  IrisTransition,
};

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  type,
  durationFrames,
  color,
  params,
}) => {
  const frame = useCurrentFrame();
  const progress = frame / durationFrames;

  const TransitionComponent = TRANSITION_MAP[type];

  if (!TransitionComponent) {
    // Fallback: no transition
    return null;
  }

  return <TransitionComponent progress={progress} color={color} params={params} />;
};

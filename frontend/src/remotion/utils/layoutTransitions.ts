/**
 * Layout Transitions for AnimaFlow.
 *
 * Detects when elements change position between scenes and generates
 * smooth transition keyframes instead of instant jumps.
 */

import { generateSpringKeyframes } from './springPhysics';

export interface LayerPosition {
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  opacity?: number;
  scale?: number;
  rotation?: number;
}

export interface TransitionConfig {
  durationFrames: number;    // Duration of transition (default: 15)
  easing: 'ease-out' | 'ease-in-out' | 'spring';
  springPreset?: string;
}

export interface TransitionKeyframe {
  frame: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  rotation: number;
}

const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  durationFrames: 15,
  easing: 'ease-out',
};

/**
 * Generate spring keyframes for transition easing.
 */
function generateSpringKeyframesForTransition(
  totalFrames: number,
  preset: string
): number[] {
  return generateSpringKeyframes(0, 1, totalFrames, preset);
}

/**
 * Generate transition keyframes between two positions.
 *
 * @param from - Starting position
 * @param to - Target position
 * @param startFrame - Frame when transition starts
 * @param config - Transition configuration
 * @returns Array of keyframes for the transition
 */
export function generateTransition(
  from: LayerPosition,
  to: LayerPosition,
  startFrame: number,
  config: TransitionConfig = DEFAULT_TRANSITION_CONFIG
): TransitionKeyframe[] {
  const { durationFrames, easing, springPreset } = config;
  const keyframes: TransitionKeyframe[] = [];

  // Pre-calculate spring keyframes if using spring easing
  const springValues = easing === 'spring' && springPreset
    ? generateSpringKeyframesForTransition(durationFrames, springPreset)
    : null;

  for (let i = 0; i <= durationFrames; i++) {
    let progress = i / durationFrames;

    // Apply easing
    if (easing === 'ease-out') {
      progress = 1 - Math.pow(1 - progress, 3);
    } else if (easing === 'ease-in-out') {
      progress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    } else if (easing === 'spring' && springValues) {
      progress = springValues[i] ?? progress;
    }

    keyframes.push({
      frame: startFrame + i,
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      opacity: (from.opacity ?? 1) + ((to.opacity ?? 1) - (from.opacity ?? 1)) * progress,
      scale: (from.scale ?? 1) + ((to.scale ?? 1) - (from.scale ?? 1)) * progress,
      rotation: (from.rotation ?? 0) + ((to.rotation ?? 0) - (from.rotation ?? 0)) * progress,
    });
  }

  return keyframes;
}

/**
 * Detect position changes between two scenes and generate transitions.
 *
 * @param prevSceneLayers - Layers from previous scene
 * @param nextSceneLayers - Layers from next scene
 * @param transitionStartFrame - Frame when transition should start
 * @param config - Transition configuration
 * @returns Map of layer IDs to transition keyframes
 */
export function detectLayoutTransitions(
  prevSceneLayers: LayerPosition[],
  nextSceneLayers: LayerPosition[],
  transitionStartFrame: number,
  config: TransitionConfig = DEFAULT_TRANSITION_CONFIG
): Map<string, TransitionKeyframe[]> {
  const transitions = new Map<string, TransitionKeyframe[]>();

  // Create a map of previous positions by ID
  const prevPositions = new Map<string, LayerPosition>();
  for (const layer of prevSceneLayers) {
    if (layer.id) {
      prevPositions.set(layer.id, layer);
    }
  }

  // Check for position changes in next scene
  for (const nextLayer of nextSceneLayers) {
    if (!nextLayer.id) continue;

    const prevLayer = prevPositions.get(nextLayer.id);
    if (!prevLayer) continue;

    // Check if position changed significantly (more than 2px)
    const dx = Math.abs((nextLayer.x ?? 0) - (prevLayer.x ?? 0));
    const dy = Math.abs((nextLayer.y ?? 0) - (prevLayer.y ?? 0));

    if (dx > 2 || dy > 2) {
      const keyframes = generateTransition(prevLayer, nextLayer, transitionStartFrame, config);
      transitions.set(nextLayer.id, keyframes);
    }
  }

  return transitions;
}

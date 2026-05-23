/**
 * primitives/index.ts — Barrel export del sistema de primitivas atómicas.
 *
 * Las primitivas son componentes base (rect, circle, text, line, etc.)
 * que la IA compone dinámicamente para construir escenas de video.
 */

// Componentes
export { AnimaRect } from './AnimaRect';
export type { AnimaRectProps } from './AnimaRect';
export { AnimaCircle } from './AnimaCircle';
export type { AnimaCircleProps } from './AnimaCircle';
export { AnimaPath } from './AnimaPath';
export type { AnimaPathProps } from './AnimaPath';
export { AnimaParticles } from './AnimaParticles';
export type { AnimaParticlesProps } from './AnimaParticles';
export { AnimaGroup } from './AnimaGroup';
export type { AnimaGroupProps } from './AnimaGroup';
export { AnimaImage } from './AnimaImage';
export type { AnimaImageProps } from './AnimaImage';
export { AnimaGradient } from './AnimaGradient';
export type { AnimaGradientProps } from './AnimaGradient';

// Tipos y helpers compartidos
export { resolveAnim, getEntryProgress } from './types';
export type { AnimValue, EntryAnimation } from './types';

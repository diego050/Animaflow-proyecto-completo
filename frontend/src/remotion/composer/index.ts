/**
 * composer/index.ts — Barrel export del sistema de composición de escenas.
 *
 * AnimaComposer es el intérprete universal que lee un `spec.json`
 * (background + layers) y lo convierte en componentes React visuales
 * en tiempo de ejecución mediante un switch determinista.
 *
 * @packageDocumentation
 */

export { AnimaComposer } from './AnimaComposer';
export type { AnimaComposerProps, BackgroundSpec, LayerSpec } from './AnimaComposer';

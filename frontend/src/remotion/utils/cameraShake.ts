import { random } from 'remotion';

export interface CameraShakeOptions {
  /** Amplitud máxima del desplazamiento en px. */
  intensity?: number;
  /** Frecuencia del temblor (sacudidas por segundo, aprox). */
  frequency?: number;
  /** Rotación máxima en grados. */
  rotation?: number;
  /** Si decae con el tiempo (impacto inicial fuerte que se calma). */
  decay?: boolean;
  /** Duración del decay en segundos (si decay=true). */
  decaySeconds?: number;
  /** Semilla para variar el patrón. */
  seed?: number;
}

/**
 * computeCameraShake — transform CSS determinista de "cámara en mano".
 *
 * Suma varias ondas seno con fases pseudo-aleatorias (deterministas vía `random`)
 * para un temblor orgánico (no robótico). Deriva solo de `frame` → 100% reproducible.
 */
export function computeCameraShake(
  frame: number,
  fps: number,
  {
    intensity = 12,
    frequency = 8,
    rotation = 0.6,
    decay = false,
    decaySeconds = 1.2,
    seed = 0,
  }: CameraShakeOptions = {},
): string {
  const t = frame / fps;

  // Fases estables por eje para que x/y no se muevan idénticos.
  const px = random(`shake-${seed}-x`) * Math.PI * 2;
  const py = random(`shake-${seed}-y`) * Math.PI * 2;
  const pr = random(`shake-${seed}-r`) * Math.PI * 2;

  // Dos octavas por eje → movimiento menos predecible.
  const wave = (phase: number, f: number) =>
    Math.sin(t * f * Math.PI * 2 + phase) * 0.65 +
    Math.sin(t * f * 1.7 * Math.PI * 2 + phase * 2) * 0.35;

  let amp = 1;
  if (decay) {
    amp = Math.max(0, 1 - t / Math.max(0.01, decaySeconds));
    amp = amp * amp; // ease-out cuadrático
  }

  const dx = wave(px, frequency) * intensity * amp;
  const dy = wave(py, frequency * 0.9) * intensity * amp;
  const rot = wave(pr, frequency * 0.6) * rotation * amp;

  // Leve scale-up para que la rotación/translate no muestre bordes del lienzo.
  const overscan = 1 + (intensity / 1000) + (rotation / 200);

  return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${overscan.toFixed(4)})`;
}

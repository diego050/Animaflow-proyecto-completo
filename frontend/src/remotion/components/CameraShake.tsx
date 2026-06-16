import React from 'react';
import type { UniversalProps } from "./types";

export interface CameraShakeProps extends UniversalProps {
  /** Amplitud del temblor en px. */
  intensity?: number;
  /** Frecuencia (sacudidas/seg aprox). */
  frequency?: number;
  /** Rotación máxima en grados. */
  rotation?: number;
  /** Impacto inicial fuerte que se calma (true) o temblor constante (false). */
  decay?: boolean;
}

/**
 * CameraShake — EFECTO DE ESCANA, no un visual.
 *
 * Es un "marcador": no dibuja nada. `AnimaComposer` detecta una capa con este
 * componentName y aplica el temblor de cámara a TODA la escena (fondo + capas),
 * usando `utils/cameraShake.computeCameraShake`. Renderizarlo suelto (ej. en el
 * Playground) no muestra nada — su efecto es a nivel de composición.
 */
export const CameraShake: React.FC<CameraShakeProps> = () => null;

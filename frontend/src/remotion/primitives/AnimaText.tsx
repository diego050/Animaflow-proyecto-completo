/**
 * AnimaText — Primitiva atómica: texto animable.
 *
 * Renderiza un `<div>` con position:absolute y estilos inline para texto.
 * Soporta animación vía AnimValue en: x, y, scale, rotation, opacity.
 * Incluye animaciones de entrada predefinidas (fade-in, slide-up, etc.).
 *
 * NOTA: El placeholder `{{text}}` debe resolverse en el padre (scene component)
 * que conoce el texto de escena. Este componente renderiza la prop `text`
 * literalmente.
 *
 * Determinista: mismas props + mismo frame = mismo output visual.
 *
 * @packageDocumentation
 */

import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';

import { resolveAnim } from './types';
import type { AnimValue } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnimaTextProps {
  /**
   * Texto a renderizar.
   * NOTA: El placeholder `{{text}}` debe ser resuelto por el padre
   * (scene component) antes de pasar esta prop.
   */
  text: string;

  /**
   * Posición X en píxeles (esquina superior izquierda).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  x?: number | AnimValue;

  /**
   * Posición Y en píxeles (esquina superior izquierda).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  y?: number | AnimValue;

  /** Tamaño de fuente en píxeles. @default 32 */
  fontSize?: number;

  /** Peso de fuente (400 = normal, 700 = bold). @default 400 */
  fontWeight?: number;

  /** Color del texto (hex, rgb, hsl, etc.). @default '#ffffff' */
  color?: string;

  /** Familia tipográfica. @default 'sans-serif' */
  fontFamily?: string;

  /** Espaciado entre caracteres en píxeles. @default 0 */
  letterSpacing?: number;

  /** Alineación horizontal del texto. @default 'center' */
  textAlign?: 'left' | 'center' | 'right';

  /**
   * Escala uniforme (1 = 100%).
   * Puede ser número fijo o AnimValue para animación.
   * @default 1
   */
  scale?: number | AnimValue;

  /**
   * Rotación en grados.
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  rotation?: number | AnimValue;

  /**
   * Opacidad (0 = transparente, 1 = opaco).
   * Puede ser número fijo o AnimValue para animación.
   * @default 1
   */
  opacity?: number | AnimValue;

  /**
   * Tipo de animación de entrada.
   * - 'fade-in':   opacidad de 0 → 1
   * - 'slide-up':   translateY de 50px → 0
   * - 'slide-down': translateY de -50px → 0
   * - 'scale-in':   scale de 0 → 1
   * - 'spring-in':  spring físico de 0 → 1
   * @default null
   */
  entry?: 'fade-in' | 'slide-up' | 'slide-down' | 'scale-in' | 'spring-in' | null;

  /**
   ** Frames de retraso antes de que comience la animación de entrada.
   * @default 0
   */
  entryDelay?: number;

  /**
   * Ancho máximo del contenedor de texto en píxeles.
   * Si se proporciona, el texto no excederá este ancho.
   * @default undefined (uses 90% of canvas)
   */
  width?: number;
}

// ---------------------------------------------------------------------------
// Helpers de entrada
// ---------------------------------------------------------------------------

/** Duración predeterminada de la animación de entrada en frames (~1s a 30fps). */
const ENTRY_DURATION = 30;

/**
 * Calcula el progreso normalizado (0→1) de la animación de entrada
 * después de aplicar el delay. Solo devuelve < 1 durante los primeros
 * `ENTRY_DURATION` frames; después devuelve 1 (entrada completada).
 */
function getEntryProgress(
  type: AnimaTextProps['entry'],
  frame: number,
  delay: number,
): number {
  if (!type) return 1;

  const adjustedFrame = Math.max(0, frame - delay);
  const raw = Math.min(1, Math.max(0, adjustedFrame / ENTRY_DURATION));

  if (raw >= 1) return 1;

  switch (type) {
    case 'fade-in':
      return Easing.out(Easing.sin)(raw);

    case 'slide-up':
    case 'slide-down':
    case 'scale-in':
      return Easing.out(Easing.back(1.7))(raw);

    case 'spring-in':
      // Se maneja por separado con spring() de Remotion, no con easing.
      return raw; // raw progress para spring

    default:
      return raw;
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaText: React.FC<AnimaTextProps> = ({
  text,
  x,
  y,
  fontSize = 32,
  fontWeight = 400,
  color = '#ffffff',
  fontFamily = 'sans-serif',
  letterSpacing = 0,
  textAlign = 'center',
  scale = 1,
  rotation = 0,
  opacity = 1,
  entry = null,
  entryDelay = 0,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // -----------------------------------------------------------------------
  // Resolver valores animados al frame actual
  // -----------------------------------------------------------------------
  const resolvedX = resolveAnim(x, frame, 0, fps);
  const resolvedY = resolveAnim(y, frame, 0, fps);
  const resolvedScale = resolveAnim(scale, frame, 1, fps);
  const resolvedRotation = resolveAnim(rotation, frame, 0, fps);
  const resolvedOpacity = resolveAnim(opacity, frame, 1, fps);

  // -----------------------------------------------------------------------
  // Texto final (el placeholder {{text}} se resuelve en el padre)
  // -----------------------------------------------------------------------
  const renderedText = text;

  // -----------------------------------------------------------------------
  // Calcular transformaciones de entrada
  // -----------------------------------------------------------------------
  let entryOpacity = 1;
  let entryTranslateY = 0;
  let entryScale = 1;

  if (entry) {
    if (entry === 'spring-in') {
      // Spring físico: el progreso determina la fuerza del resorte
      // pero se usa duration = ENTRY_DURATION para mantener consistencia
      const adjustedFrame = Math.max(0, frame - entryDelay);
      const spr = spring({
        frame: adjustedFrame,
        fps,
        config: {
          damping: 12,
          stiffness: 80,
          mass: 1,
        },
      });
      // El spring tiende asintóticamente a 1
      entryOpacity = Math.min(1, spr);
      entryScale = Math.min(1, spr);
    } else {
      const progress = getEntryProgress(entry, frame, entryDelay);

      switch (entry) {
        case 'fade-in':
          entryOpacity = progress;
          break;

        case 'slide-up':
          entryOpacity = progress;
          entryTranslateY = interpolate(progress, [0, 1], [50, 0]);
          break;

        case 'slide-down':
          entryOpacity = progress;
          entryTranslateY = interpolate(progress, [0, 1], [-50, 0]);
          break;

        case 'scale-in':
          entryOpacity = progress;
          entryScale = interpolate(progress, [0, 1], [0, 1]);
          break;

        default:
          break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Construir estilos inline — sin Tailwind, sin Framer Motion
  // -----------------------------------------------------------------------
  const style: React.CSSProperties = {
    position: 'absolute',
    // v7: x/y son el CENTRO absoluto (el layoutSolver ya lo resolvió). El
    // translate(-50%,-50%) de abajo centra el elemento sobre ese punto.
    left: `${resolvedX}px`,
    top: `${resolvedY}px`,
    fontSize,
    fontWeight,
    color,
    fontFamily,
    letterSpacing,
    textAlign,
    margin: 0,
    padding: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.4,
    transform: [
      `translate(${textAlign === 'left' ? 0 : textAlign === 'right' ? '-100%' : '-50%'}, -50%)`,
      `translateY(${entryTranslateY}px)`,
      `scale(${resolvedScale * entryScale})`,
      `rotate(${resolvedRotation}deg)`,
    ]
      .filter(Boolean)
      .join(' '),
    transformOrigin: 'center center',
    opacity: resolvedOpacity * entryOpacity,
    pointerEvents: 'none',
    boxSizing: 'border-box',
    width: textAlign === 'center' ? '100%' : undefined,
    maxWidth: width ? `${width}px` : '90%',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  };

  return <div style={style}>{renderedText}</div>;
};

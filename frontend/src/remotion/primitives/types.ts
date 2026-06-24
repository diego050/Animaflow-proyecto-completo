/**
 * types.ts — Tipos y funciones helper para las primitivas animables de AnimaFlow.
 *
 * Estas primitivas son "átomos" visuales que la IA compone dinámicamente
 * para construir escenas de video. Todas las funciones son 100% deterministas.
 *
 * Dependencias: Remotion (Easing, interpolate, spring)
 */

import { Easing, interpolate, spring } from 'remotion';

// ---------------------------------------------------------------------------
// AnimValue
// ---------------------------------------------------------------------------

/**
 * AnimValue — Un valor que puede ser:
 * - Un número fijo (estático)
 * - Un objeto con interpolación animada entre `from` y `to`
 *
 * Esto permite que cualquier prop (x, y, scale, opacity, rotation, etc.)
 * sea animable sin cambiar la interfaz del componente.
 */
export type AnimValue =
  | number
  | {
      /** Valor inicial del frame 0 (o tras `delay` frames) */
      from: number;
      /** Valor final tras completar la interpolación */
      to: number;
      /** Duración en frames de la animación (default: 30 ≈ 1s a 30fps) */
      duration?: number;
      /** Frames de retraso antes de iniciar (default: 0) */
      delay?: number;
      /**
       * Función de easing:
       * - 'linear'     → transición lineal
       * - 'ease-in'    → comienza lento, acelera
       * - 'ease-out'   → comienza rápido, desacelera
       * - 'ease-in-out' → suave al inicio y final
       * - 'spring'     → físico con rebote (usa spring() de Remotion)
       * @default 'linear'
       */
      easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
      /** Configuración para easing tipo 'spring' */
      springConfig?: {
        damping?: number;
        stiffness?: number;
        mass?: number;
      };
    };

// ---------------------------------------------------------------------------
// EntryAnimation
// ---------------------------------------------------------------------------

/**
 * EntryAnimation — Tipos de animación de entrada predefinidos.
 * Se usa con getEntryProgress() para calcular un progreso 0→1.
 */
export type EntryAnimation =
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'bounce-in';

// ---------------------------------------------------------------------------
// resolveAnim
// ---------------------------------------------------------------------------

/**
 * resolveAnim — Convierte un AnimValue en un número concreto para un frame dado.
 *
 * - Si `val` es `undefined` o `null`, retorna `defaultVal`.
 * - Si `val` es `number`, lo retorna directamente (no hay animación).
 * - Si `val` es un objeto, aplica interpolación o spring según `easing`.
 *
 * @param val        Valor animable (AnimValue | undefined)
 * @param frame      Frame actual (normalmente de useCurrentFrame())
 * @param defaultVal Valor por defecto si val es undefined/null
 * @param fps        Frames por segundo (default: 30, para spring())
 *
 * @example
 * ```tsx
 * const frame = useCurrentFrame();
 * const x = resolveAnim(props.x, frame, 0);
 * const opacity = resolveAnim(props.opacity, frame, 1);
 * ```
 */
export function resolveAnim(
  val: AnimValue | undefined,
  frame: number,
  defaultVal: number,
  fps: number = 30,
): number {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'number') return val;

  const {
    from,
    to,
    duration = 30,
    delay = 0,
    easing = 'linear',
    springConfig,
  } = val;

  // Frame ajustado por delay (nunca negativo)
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Spring físico ---
  if (easing === 'spring') {
    const spr = spring({
      frame: adjustedFrame,
      fps,
      config: {
        damping: springConfig?.damping ?? 14,
        stiffness: springConfig?.stiffness ?? 100,
        mass: springConfig?.mass ?? 1,
      },
    });
    return interpolate(spr, [0, 1], [from, to]);
  }

  // --- Interpolación estándar con easing ---
  const rawProgress = Math.min(1, Math.max(0, adjustedFrame / duration));

  const easingMap: Record<string, (t: number) => number> = {
    'linear': Easing.linear,
    'ease-in': Easing.bezier(0.42, 0, 1, 1),
    'ease-out': Easing.bezier(0, 0, 0.58, 1),
    'ease-in-out': Easing.bezier(0.42, 0, 0.58, 1),
  };

  return interpolate(rawProgress, [0, 1], [from, to], {
    easing: easingMap[easing],
  });
}

// ---------------------------------------------------------------------------
// getEntryProgress
// ---------------------------------------------------------------------------

/**
 * getEntryProgress — Calcula el progreso normalizado (0→1) de una animación
 * de entrada predefinida, útil para componentes que quieran sincronizar
 * múltiples propiedades animadas con un solo tipo de entrada.
 *
 * @param type  Tipo de animación de entrada (EntryAnimation)
 * @param frame Frame actual (useCurrentFrame())
 *
 * @returns Valor entre 0 y 1 representando el progreso de la entrada.
 *
 * @example
 * ```tsx
 * const progress = getEntryProgress('bounce-in', frame);
 * const opacity = progress;
 * const scale = interpolate(progress, [0, 1], [0.5, 1]);
 * ```
 */
export function getEntryProgress(
  type: EntryAnimation,
  frame: number,
): number {
  if (type === 'none') return 1;

  // Duración base de 30 frames (~1s a 30fps)
  const duration = 30;
  const rawProgress = Math.min(1, Math.max(0, frame / duration));

  switch (type) {
    case 'fade-in':
      return Easing.out(Easing.sin)(rawProgress);

    case 'bounce-in':
      return Easing.elastic(1)(rawProgress);

    case 'slide-up':
    case 'slide-down':
    case 'slide-left':
    case 'slide-right':
    case 'scale-in':
      return Easing.out(Easing.back(1.7))(rawProgress);

    default:
      return rawProgress;
  }
}

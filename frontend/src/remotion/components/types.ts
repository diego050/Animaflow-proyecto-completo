/**
 * UniversalProps — Propiedades base que TODOS los componentes de AnimaFlow aceptan.
 * 
 * Esto permite al LLM personalizar colores, tamaños y tiempos
 * de cualquier componente sin restricciones.
 */

export interface UniversalProps {
  /** Posición horizontal (px) */
  x?: number;
  /** Posición vertical (px) */
  y?: number;
  /** Color principal / acento del componente (hex) */
  color?: string;
  /** Color de fondo del componente (hex) */
  bgColor?: string;
  /** Color del texto principal (hex) */
  textColor?: string;
  /** Tamaño de fuente principal (px) */
  fontSize?: number;
  /** Ancho del componente (px) */
  width?: number;
  /** Alto del componente (px) */
  height?: number;
  /** Frames de retraso antes de que el componente aparezca */
  delay?: number;

  // --- Transformaciones universales (las aplica el wrapper, NO el componente) ---
  // Son ATÓMICAS: funcionan en cualquier componente sin que este las implemente.
  // Ver UniversalTransform.tsx + AnimaComposer (case 'component').
  /** Escala uniforme alrededor del ancla (x,y). 1 = tamaño natural. */
  scale?: number;
  /** Rotación en grados alrededor del ancla (x,y). */
  rotation?: number;
  /** Opacidad global del componente (0–1). Se multiplica con la de entry/exit. */
  opacity?: number;
  /** Orden de apilado. Mayor = más al frente (p.ej. ripple detrás de un texto). */
  zIndex?: number;

  /**
   * Desactiva la entrada PROPIA del componente (los que la traen, p.ej.
   * BreakingNewsAlert/BreakingNewsTicker). Lo activa automáticamente el composer
   * cuando la capa define un `entry` explícito, para que la animación del wrapper
   * tome el control y no se animen dos entradas a la vez. Por defecto la entrada
   * propia se reproduce (false).
   */
  disableEntry?: boolean;
}

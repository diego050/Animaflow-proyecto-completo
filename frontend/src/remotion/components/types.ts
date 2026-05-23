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
}

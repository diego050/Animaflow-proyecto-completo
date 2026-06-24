/**
 * AnimaGradient — Helper de fondos gradientes para el sistema de primitivas.
 *
 * NO es una primitiva que se renderice como capa directa visible, sino un
 * HELPER interno usado por AnimaComposer para aplicar fondos (solid,
 * linear-gradient, radial-gradient) a composiciones.
 *
 * Determinista: mismas props = mismo output visual (sin dependencia del frame).
 *
 * @packageDocumentation
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnimaGradientProps {
  /**
   * Tipo de fondo:
   * - `'solid'`            → color sólido usando `colors[0]`
   * - `'linear-gradient'`   → gradiente lineal con ángulo configurable
   * - `'radial-gradient'`   → gradiente radial con centro configurable
   */
  type: 'solid' | 'linear-gradient' | 'radial-gradient';

  /**
   * Lista de colores para el gradiente.
   * - Si `type='solid'`, solo se usa `colors[0]` como background-color.
   * - Para gradientes, se concatenan en el orden dado.
   *
   * Formatos aceptados: hex, rgb, rgba, hsl, hsla, nombres CSS.
   */
  colors: string[];

  /**
   * Ángulo del gradiente lineal en grados (0–360).
   * Solo aplica cuando `type='linear-gradient'`.
   * @default 180
   */
  angle?: number;

  /**
   * Centro del gradiente radial como coordenadas [x, y] en píxeles.
   * Solo aplica cuando `type='radial-gradient'`.
   * @default [50, 50]
   */
  center?: [number, number];

  /** Ancho en píxeles que ocupará el fondo (100% del contenedor padre). */
  width: number;

  /** Alto en píxeles que ocupará el fondo (100% del contenedor padre). */
  height: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Construye el valor CSS `background` según el tipo de gradiente.
 * Función pura, 100% determinista.
 */
function buildBackground(type: string, colors: string[], angle?: number, center?: [number, number]): string {
  switch (type) {
    case 'solid':
      // Fondo sólido: solo se usa el primer color
      return colors[0] ?? 'transparent';

    case 'linear-gradient': {
      const deg = angle ?? 180;
      return `linear-gradient(${deg}deg, ${colors.join(', ')})`;
    }

    case 'radial-gradient': {
      const cx = center?.[0] ?? 50;
      const cy = center?.[1] ?? 50;
      return `radial-gradient(circle at ${cx}px ${cy}px, ${colors.join(', ')})`;
    }

    default:
      return 'transparent';
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaGradient: React.FC<AnimaGradientProps> = ({
  type,
  colors,
  angle,
  center,
  width,
  height,
}) => {
  // Construir el valor CSS background
  const background = buildBackground(type, colors, angle, center);

  // Estilos inline — sin Tailwind, sin Framer Motion
  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
    width,
    height,
    background,
    pointerEvents: 'none',
  };

  return <div style={style} />;
};

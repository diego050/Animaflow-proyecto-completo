/**
 * AnimaParticles — Primitiva atómica: sistema de partículas animadas.
 *
 * Renderiza `count` partículas con forma, color, tamaño y movimiento
 * pseudoaleatorio pero 100% DETERMINISTA. Cada partícula flota, parpadea
 * y respira con frecuencias únicas derivadas de su índice.
 *
 * Determinista: mismas props + mismo frame = misma salida SIEMPRE.
 * No usa Math.random() en ningún momento.
 *
 * @packageDocumentation
 */

import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { resolveAnim } from './types';
import type { AnimValue } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnimaParticlesProps {
  /** Cantidad de partículas a renderizar. */
  count: number;

  /** Forma geométrica de cada partícula. */
  shape?: 'circle' | 'rect' | 'star';

  /** Factor de dispersión: qué tan separadas aparecen las partículas. */
  spread: number;

  /**
   * Paleta de colores. Cada partícula elige uno determinísticamente
   * según (i % colors.length).
   */
  colors: string[];

  /**
   * Centro X del sistema de partículas (px).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  x?: number | AnimValue;

  /**
   * Centro Y del sistema de partículas (px).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  y?: number | AnimValue;

  /**
   * Escala general del sistema de partículas (1 = 100%).
   * Puede ser número fijo o AnimValue.
   * @default 1
   */
  scale?: number | AnimValue;

  /**
   * Rotación general del sistema de partículas en grados.
   * Puede ser número fijo o AnimValue.
   * @default 0
   */
  rotation?: number | AnimValue;

  /**
   * Opacidad general del sistema de partículas (0–1).
   * Puede ser número fijo o AnimValue.
   * @default 1
   */
  opacity?: number | AnimValue;

  /**
   * Multiplicador de velocidad de animación.
   * @default 1
   */
  speed?: number;

  /**
   * Rango de tamaño de las partículas en píxeles.
   * El tamaño de cada partícula se interpola determinísticamente.
   */
  size?: { min?: number; max?: number };
}

// ---------------------------------------------------------------------------
// Helpers deterministas
// ---------------------------------------------------------------------------

/**
 * Elige un color del array de forma determinista según el índice.
 */
function pickColor(colors: string[], index: number): string {
  return colors[index % colors.length];
}

/**
 * Calcula el tamaño de una partícula interpolando entre min y max
 * según su índice relativo al total.
 */
function pickSize(
  index: number,
  count: number,
  sizeMin: number,
  sizeMax: number,
): number {
  const t = count > 1 ? index / (count - 1) : 0.5;
  return sizeMin + t * (sizeMax - sizeMin);
}

// ---------------------------------------------------------------------------
// Star shape SVG
// ---------------------------------------------------------------------------

/**
 * Genera el path SVG de una estrella de 5 puntas centrada en (0,0)
 * con el radio exterior dado.
 */
function starPath(outerR: number): string {
  const innerR = outerR * 0.4;
  const points = 5;
  const step = Math.PI / points;
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + i * step;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaParticles: React.FC<AnimaParticlesProps> = ({
  count,
  shape = 'circle',
  spread,
  colors,
  x,
  y,
  scale = 1,
  rotation = 0,
  opacity = 1,
  speed = 1,
  size = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Resolver animaciones del sistema al frame actual
  const resolvedX = resolveAnim(x, frame, 0, fps);
  const resolvedY = resolveAnim(y, frame, 0, fps);
  const resolvedScale = resolveAnim(scale, frame, 1, fps);
  const resolvedRotation = resolveAnim(rotation, frame, 0, fps);
  const resolvedOpacity = resolveAnim(opacity, frame, 1, fps);

  const sizeMin = size.min ?? 4;
  const sizeMax = size.max ?? 20;

  // Generar partículas: memoize para evitar recálculos innecesarios
  // (aunque cada frame cambia, el cálculo es O(n) y determinista)
  const particles = useMemo(() => {
    const result: Array<{
      id: number;
      px: number;
      py: number;
      sz: number;
      col: string;
      phaseOffset: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      // Posición base: distribuir partículas radialmente con dispersión
      const angle = (i / count) * Math.PI * 2;
      const radius = ((i + 1) / count) * spread;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;

      // Tamaño determinista
      const sz = pickSize(i, count, sizeMin, sizeMax);

      // Color determinista
      const col = pickColor(colors, i);

      // Fase única por partícula para movimiento orgánico
      const phaseOffset = (i * 1.7) % (Math.PI * 2);

      result.push({ id: i, px, py, sz, col, phaseOffset });
    }

    return result;
  }, [count, spread, colors, sizeMin, sizeMax]);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `calc(50% + ${resolvedX}px)`,
    top: `calc(50% + ${resolvedY}px)`,
    transform: [
      'translate(-50%, -50%)',
      `scale(${resolvedScale})`,
      `rotate(${resolvedRotation}deg)`,
    ].join(' '),
    transformOrigin: 'center center',
    opacity: resolvedOpacity,
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {particles.map((p) => {
        // ── Movimiento individual ──────────────────────────────────────
        // Cada partícula se mueve en una trayectoria elíptica orgánica
        // usando Math.sin/cos con frecuencias diferentes por eje.
        // Frecuencias base para movimiento orgánico:
        const freqX = 0.015 + (p.id % 7) * 0.002;
        const freqY = 0.012 + (p.id % 5) * 0.003;
        const freqOpacity = 0.025 + (p.id % 3) * 0.005;
        const freqScale = 0.018 + (p.id % 4) * 0.004;

        // Amplitud del movimiento relativa al tamaño (partículas más grandes
        // se mueven más lento, más pequeñas más rápido — efecto de masa)
        const amplitude = 4 + (p.id % 3) * 2;

        const driftX =
          Math.sin(frame * speed * freqX + p.phaseOffset) * amplitude;
        const driftY =
          Math.cos(frame * speed * freqY + p.phaseOffset * 1.3) * amplitude;

        // ── Opacidad individual (efecto parpadeo) ──────────────────────
        // Oscila entre 0.4 y 1.0 para efecto de destello
        const flicker =
          0.6 +
          0.4 * Math.sin(frame * speed * freqOpacity + p.phaseOffset * 0.7);

        // ── Escala individual (efecto respiración) ─────────────────────
        // Oscila entre 0.7 y 1.3 alrededor de la escala base
        const breathe =
          1.0 +
          0.3 * Math.sin(frame * speed * freqScale + p.phaseOffset * 0.5);

        // ── Posición final ─────────────────────────────────────────────
        const finalX = p.px + driftX;
        const finalY = p.py + driftY;
        const finalScale = breathe;
        const finalOpacity = flicker;

        if (shape === 'star') {
          // Para estrellas usamos un SVG inline centrado
          const starD = starPath(p.sz / 2);
          return (
            <svg
              key={p.id}
              width={p.sz}
              height={p.sz}
              viewBox={`${-p.sz / 2} ${-p.sz / 2} ${p.sz} ${p.sz}`}
              style={{
                position: 'absolute',
                left: finalX - p.sz / 2,
                top: finalY - p.sz / 2,
                transform: `scale(${finalScale})`,
                transformOrigin: 'center center',
                opacity: finalOpacity,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <path
                d={starD}
                fill={p.col}
                stroke="none"
              />
            </svg>
          );
        }

        // Estilo base para circle y rect
        const particleStyle: React.CSSProperties = {
          position: 'absolute',
          left: finalX - p.sz / 2,
          top: finalY - p.sz / 2,
          width: p.sz,
          height: p.sz,
          backgroundColor: p.col,
          transform: `scale(${finalScale})`,
          transformOrigin: 'center center',
          opacity: finalOpacity,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        };

        if (shape === 'circle') {
          particleStyle.borderRadius = '50%';
        }

        // shape === 'rect' no necesita propiedades adicionales
        return <div key={p.id} style={particleStyle} />;
      })}
    </div>
  );
};

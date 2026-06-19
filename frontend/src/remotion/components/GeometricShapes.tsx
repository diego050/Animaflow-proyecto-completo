import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * GeometricShapes — Una figura geométrica configurable, centrada en (x,y).
 *
 * En vez de elegir un "nombre" de figura, se define por geometría:
 *  - `points` > 0  → ESTRELLA de N puntas (gana sobre `sides`).
 *  - `sides` <= 2  → CÍRCULO / ÓVALO (un óvalo es un círculo con width != height).
 *  - `sides` === 4 → RECTÁNGULO / CUADRADO (con `cornerRadius`).
 *  - `sides` >= 3  → POLÍGONO regular de N lados (triángulo=3, pentágono=5, ...).
 *
 * `width`/`height` definen la caja: iguales = figura regular, distintos = estirada
 * (óvalo, rectángulo, triángulo isósceles, etc.). `size` es el valor por defecto
 * de ambos. No hay "ring": para un anillo usa `sides` 0 con `filled` desactivado.
 *
 * Determinista: el giro opcional (`spin`) deriva de `frame`, sin Math.random.
 */
interface GeometricShapesProps extends UniversalProps {
  /** Nº de lados: 0/1/2 = círculo·óvalo, 3 = triángulo, 4 = rectángulo, 5+ = polígono. */
  sides?: number;
  /** Nº de puntas de estrella (>= 3). Si es > 0 ignora `sides`. 0 = sin estrella. */
  points?: number;
  /** Tamaño por defecto de width y height (px). */
  size?: number;
  filled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  /** Giro continuo en grados por segundo (0 = estático). */
  spin?: number;
}

/** Puntos de un polígono regular de `sides` lados, escalado a una caja rx×ry. */
function polygonPoints(sides: number, rx: number, ry: number, cx: number, cy: number, rotation = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((rotation + (360 / sides) * i) * Math.PI) / 180;
    pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/** Puntos de una estrella de `points` puntas, escalada a una caja rx×ry. */
function starPoints(points: number, rx: number, ry: number, cx: number, cy: number, innerRatio = 0.45): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const k = i % 2 === 0 ? 1 : innerRatio;
    const angle = ((-90 + (180 / points) * i) * Math.PI) / 180;
    pts.push(`${cx + rx * k * Math.cos(angle)},${cy + ry * k * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export const GeometricShapes: React.FC<GeometricShapesProps> = ({
  sides = 0,
  points = 0,
  size = 240,
  filled = true,
  color = '#6366f1',
  strokeColor = '#6366f1',
  strokeWidth = 8,
  cornerRadius = 24,
  spin = 0,
  width,
  height,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const w = width ?? size;
  const h = height ?? size;

  const fill = filled ? color : 'none';
  const stroke = filled ? 'none' : strokeColor;
  const sw = filled ? 0 : strokeWidth;

  const cx = w / 2;
  const cy = h / 2;
  // Radios de la caja menos medio trazo, para que el stroke no se recorte.
  const rx = (w - sw) / 2;
  const ry = (h - sw) / 2;

  const rotateDeg = (adjustedFrame / fps) * spin;

  let shapeEl: React.ReactNode;
  if (points >= 3) {
    shapeEl = <polygon points={starPoints(points, rx, ry, cx, cy)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  } else if (sides >= 3 && sides !== 4) {
    shapeEl = <polygon points={polygonPoints(sides, rx, ry, cx, cy)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  } else if (sides === 4) {
    shapeEl = (
      <rect
        x={sw / 2}
        y={sw / 2}
        width={w - sw}
        height={h - sw}
        rx={cornerRadius}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  } else {
    // sides <= 2 → círculo / óvalo (rx != ry => óvalo).
    shapeEl = <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
        zIndex: 5,
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {shapeEl}
      </svg>
    </div>
  );
};

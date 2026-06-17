import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * GeometricShapes — Una figura geométrica configurable, centrada en (x,y).
 *
 * Pensado como acento/fondo reutilizable (p.ej. detrás de un texto, combinándolo
 * con el `zIndex` universal). Cubre el caso "necesito una figura simple al centro"
 * que antes obligaba a usar componentes casi idénticos (ver fusión RippleEffect).
 *
 * Determinista: el giro opcional (`spin`) deriva de `frame`, sin Math.random.
 */
type ShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'ring';

interface GeometricShapesProps extends UniversalProps {
  shape?: ShapeKind;
  size?: number;
  filled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  /** Giro continuo en grados por segundo (0 = estático). */
  spin?: number;
}

/** Puntos de un polígono regular de `sides` lados inscrito en un radio `r`. */
function regularPolygon(sides: number, r: number, cx: number, cy: number, rotation = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((rotation + (360 / sides) * i) * Math.PI) / 180;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/** Puntos de una estrella de `points` puntas. */
function starPolygon(points: number, rOuter: number, rInner: number, cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = ((-90 + (180 / points) * i) * Math.PI) / 180;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export const GeometricShapes: React.FC<GeometricShapesProps> = ({
  shape = 'circle',
  size = 240,
  filled = true,
  color = '#6366f1',
  strokeColor = '#6366f1',
  strokeWidth = 8,
  cornerRadius = 24,
  spin = 0,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const fill = filled ? color : 'none';
  const stroke = filled ? 'none' : strokeColor;
  const sw = filled ? 0 : strokeWidth;

  const cx = size / 2;
  const cy = size / 2;
  // Margen para que el trazo no se recorte.
  const r = size / 2 - strokeWidth;

  const rotateDeg = (adjustedFrame / fps) * spin;

  let shapeEl: React.ReactNode;
  switch (shape) {
    case 'square':
      shapeEl = (
        <rect
          x={sw / 2}
          y={sw / 2}
          width={size - sw}
          height={size - sw}
          rx={cornerRadius}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      );
      break;
    case 'triangle':
      shapeEl = <polygon points={regularPolygon(3, r, cx, cy)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      break;
    case 'pentagon':
      shapeEl = <polygon points={regularPolygon(5, r, cx, cy)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      break;
    case 'hexagon':
      shapeEl = <polygon points={regularPolygon(6, r, cx, cy)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      break;
    case 'star':
      shapeEl = <polygon points={starPolygon(5, r, r * 0.45, cx, cy)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
      break;
    case 'ring':
      // Siempre anillo (trazo, sin relleno) independientemente de `filled`.
      shapeEl = <circle cx={cx} cy={cy} r={r} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
      break;
    case 'circle':
    default:
      shapeEl = <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
      break;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
        zIndex: 5,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {shapeEl}
      </svg>
    </div>
  );
};

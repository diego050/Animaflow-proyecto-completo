import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

/**
 * FloatingBlobs — fondo AMBIENTAL de glows de color suaves (v8 / Fase 4, atómico).
 *
 * Glows radiales que se desvanecen a transparente + blur, con deriva lenta. Es un
 * acento de color, no formas duras. Ahora:
 *  - CONFINABLE a una región con x/y (centro) y width/height → el efecto puede
 *    ocupar solo media pantalla, subirse, estirarse o achicarse; los blobs se
 *    distribuyen dentro de esa caja.
 *  - count hasta 20, tamaño (`blobSize`) y variación de tamaño configurables → se
 *    pueden tener muchos blobs pequeños con mucho espacio entre ellos.
 *  - hasta 3 colores que se alternan por blob.
 *
 * Determinista (función pura de frame). Respeta `opacity` (el post-proceso lo
 * capa a ≤0.30 cuando hay contenido encima).
 */
export const FloatingBlobs: React.FC<{
  color1?: string;
  color2?: string;
  color3?: string;
  width?: number;
  height?: number;
  opacity?: number;
  /** Número de glows (1–20). */
  count?: number;
  /** Diámetro base de cada glow (% de vmin). */
  blobSize?: number;
  /** Variación aleatoria de tamaño entre blobs (0–1). */
  sizeVariation?: number;
  /** Desenfoque del conjunto (en vmin). */
  blur?: number;
} & UniversalProps> = ({
  color1 = '#f43f5e', // Rose
  color2 = '#38bdf8', // Sky
  color3 = '#a855f7', // Purple
  x,
  y,
  width,
  height,
  delay = 0,
  color,
  opacity = 1,
  count = 3,
  blobSize = 40,
  sizeVariation = 0.4,
  blur = 6,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Región (caja) donde viven los blobs. Por defecto, todo el lienzo.
  const W = typeof width === 'number' ? width : c.width;
  const H = typeof height === 'number' ? height : c.height;
  const posX = typeof x === 'number' ? x : c.width / 2;
  const posY = typeof y === 'number' ? y : c.height / 2;

  // Pseudo-aleatorio determinista por blob (sin Math.random).
  const rand = (i: number, salt: number) => {
    const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const toTransparent = (hex: string) =>
    /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}00` : 'transparent';

  const palette = [color || color1, color2, color3];
  const n = Math.max(1, Math.min(20, Math.round(Number(count) || 3)));

  return (
    <div
      style={{
        position: 'absolute',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${W}px`,
        height: `${H}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        opacity,
        filter: `blur(${c.vmin(Number(blur) || 6)}px)`,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: n }).map((_, i) => {
        const col = palette[i % palette.length];
        const baseX = rand(i, 1) * W;
        const baseY = rand(i, 2) * H;
        const d = c.vmin(blobSize) * (1 + sizeVariation * (rand(i, 3) - 0.5) * 2);
        const period = 80 + rand(i, 4) * 80;
        const phase = rand(i, 5) * 200;
        const driftX = Math.sin((adjustedFrame + phase) / period) * c.vw(4);
        const driftY = Math.cos((adjustedFrame + phase) / (period * 1.3)) * c.vh(3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${baseX + driftX}px`,
              top: `${baseY + driftY}px`,
              width: `${d}px`,
              height: `${d}px`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${col} 0%, ${toTransparent(col)} 70%)`,
              borderRadius: '50%',
            }}
          />
        );
      })}
    </div>
  );
};

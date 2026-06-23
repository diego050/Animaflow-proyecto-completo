/**
 * StylePixelTransition — background effect where pixels appear randomly
 * with different colors, creating a pixelated transition/fill effect.
 *
 * Each pixel has a deterministic random delay and appears at its own time.
 * Fully configurable: pixel size, color ranges, background, max delay.
 */
import React, { useMemo } from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

export interface StylePixelTransitionProps extends UniversalProps {
  pixelSize?: number;
  width?: number;   // Grid area width (default: full canvas)
  height?: number;  // Grid area height (default: full canvas)
  bgColor?: string;
  hueStart?: number;
  hueRange?: number;
  saturationMin?: number;
  saturationMax?: number;
  lightnessMin?: number;
  lightnessMax?: number;
  maxDelay?: number;
  style?: Record<string, unknown>;
}

export const StylePixelTransition: React.FC<StylePixelTransitionProps> = ({
  x = 540,
  y = 960,
  pixelSize,
  width,
  height,
  bgColor = '#0f172a',
  hueStart = 200,
  hueRange = 220,
  saturationMin = 70,
  saturationMax = 100,
  lightnessMin = 40,
  lightnessMax = 60,
  maxDelay = 60,
  style,
}) => {
  const frame = useCurrentFrame();
  const { width: canvasWidth, height: canvasHeight } = useVideoConfig();
  const c = useCanvas();

  // Responsive pixel size: use prop or default to 2% of vmin
  const resolvedPixelSize = pixelSize ?? c.vmin(2);

  // Use provided dimensions or fall back to full canvas
  const compWidth = width ?? canvasWidth;
  const compHeight = height ?? canvasHeight;

  // Compute grid dimensions
  const cols = Math.ceil(compWidth / resolvedPixelSize);
  const rows = Math.ceil(compHeight / resolvedPixelSize);

  // Deterministic pixel grid — memoized to avoid recomputation every frame
  const pixels = useMemo(() => {
    const result: Array<{ x: number; y: number; color: string }> = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const seed = col * 10000 + row;
        const delay = Math.floor(random(seed) * maxDelay);

        // Only include pixels whose delay has passed
        if (frame > delay) {
          const hue = hueStart + Math.floor(random(seed * 2) * hueRange);
          const saturation =
            saturationMin +
            Math.floor(random(seed * 3) * (saturationMax - saturationMin));
          const lightness =
            lightnessMin +
            Math.floor(random(seed * 4) * (lightnessMax - lightnessMin));

          result.push({
            x: col * resolvedPixelSize,
            y: row * resolvedPixelSize,
            color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
          });
        }
      }
    }

    return result;
  }, [frame, rows, cols, resolvedPixelSize, hueStart, hueRange, saturationMin, saturationMax, lightnessMin, lightnessMax, maxDelay]);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: compWidth,
        height: compHeight,
        backgroundColor: bgColor,
        overflow: 'hidden',
        ...style,
      }}
    >
      {pixels.map((pixel, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: pixel.x,
            top: pixel.y,
            width: resolvedPixelSize,
            height: resolvedPixelSize,
            backgroundColor: pixel.color,
          }}
        />
      ))}
    </div>
  );
};

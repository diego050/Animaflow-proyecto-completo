/**
 * StyleGridPulse — Grid of dots with a pulse wave traveling outward from center.
 *
 * Deterministic: all animations driven by useCurrentFrame() + pure math.
 * Coordinate contract: x/y are offsets from canvas center.
 * Uses useCanvas() for responsive sizing.
 */
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StyleGridPulseProps extends UniversalProps {
  cols?: number;
  rows?: number;
  width?: number;
  height?: number;
  bgColor?: string;
  dotColor?: string;
  dotSize?: number;
  waveSpeed?: number;
  waveFrequency?: number;
  minOpacity?: number;
  maxOpacity?: number;
  minScale?: number;
  maxScale?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleGridPulse: React.FC<StyleGridPulseProps> = ({
  x = 540,
  y = 960,
  cols = 12,
  rows = 8,
  width,
  height,
  bgColor = '#111827',
  dotColor = '#3b82f6',
  dotSize,
  waveSpeed = 3,
  waveFrequency = 0.8,
  minOpacity = 0.15,
  maxOpacity = 1.0,
  minScale = 0.4,
  maxScale = 1.0,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const c = useCanvas();

  // --- Responsive sizing via useCanvas ---
  const areaWidth = width ?? c.width;
  const areaHeight = height ?? c.height;
  const dotDiameter = dotSize ?? c.vmin(1);

  // --- Coordinate contract: x/y offsets from center ---
  const centerX = x;
  const centerY = y;

  // =========================================================================
  // Compute dots array (deterministic, pure math)
  // =========================================================================
  const dots = useMemo(() => {
    const t = adjustedFrame / 30; // time in seconds
    const spacingX = areaWidth / (cols + 1);
    const spacingY = areaHeight / (rows + 1);
    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;

    const result: Array<{
      x: number;
      y: number;
      opacity: number;
      scale: number;
      key: number;
    }> = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = col - centerCol;
        const dy = row - centerRow;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const wave = Math.sin(t * waveSpeed - distance * waveFrequency);
        const normalizedWave = wave * 0.5 + 0.5; // 0 to 1

        const opacity = minOpacity + normalizedWave * (maxOpacity - minOpacity);
        const scale = minScale + normalizedWave * (maxScale - minScale);

        result.push({
          x: spacingX * (col + 1),
          y: spacingY * (row + 1),
          opacity,
          scale,
          key: row * cols + col,
        });
      }
    }

    return result;
  }, [
    adjustedFrame, areaWidth, areaHeight, cols, rows,
    waveSpeed, waveFrequency, minOpacity, maxOpacity, minScale, maxScale,
  ]);

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div
      style={{
        position: 'absolute',
        left: `${centerX}px`,
        top: `${centerY}px`,
        transform: 'translate(-50%, -50%)',
        width: areaWidth,
        height: areaHeight,
        backgroundColor: bgColor,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: (style?.opacity as number) ?? 1,
        ...style,
      }}
    >
      {dots.map((dot) => (
        <div
          key={dot.key}
          style={{
            position: 'absolute',
            left: `${dot.x}px`,
            top: `${dot.y}px`,
            width: dotDiameter,
            height: dotDiameter,
            borderRadius: '50%',
            backgroundColor: dotColor,
            opacity: dot.opacity,
            transform: `translate(-50%, -50%) scale(${dot.scale})`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

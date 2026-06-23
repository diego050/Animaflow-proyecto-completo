/**
 * StyleBokehCircles — Bokeh/depth-of-field effect with soft, glowing circles
 * that drift slowly and pulse in size. Each circle has a radial gradient
 * for a soft glow effect.
 *
 * Deterministic: all animations driven by useCurrentFrame(), no Math.random().
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

export interface StyleBokehCirclesProps extends UniversalProps {
  /** Number of bokeh circles */
  circleCount?: number;
  /** Area width in px (default: full canvas) */
  width?: number;
  /** Area height in px (default: full canvas) */
  height?: number;
  /** Background color */
  bgColor?: string;
  /** Array of RGB color tuples for circles, e.g. [[59,130,246], [139,92,246]] */
  colors?: Array<[number, number, number]>;
  /** Minimum circle size in px */
  minSize?: number;
  /** Maximum circle size in px */
  maxSize?: number;
  /** Drift and pulse speed multiplier */
  speed?: number;
  /** Minimum circle opacity */
  minOpacity?: number;
  /** Maximum circle opacity */
  maxOpacity?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleBokehCircles: React.FC<StyleBokehCirclesProps> = ({
  x = 0,
  y = 0,
  circleCount = 15,
  width,
  height,
  bgColor = '#111827',
  colors = [
    [59, 130, 246],   // blue
    [139, 92, 246],   // purple
    [20, 184, 166],   // teal
  ],
  minSize = 40,
  maxSize = 120,
  speed = 1,
  minOpacity = 0.1,
  maxOpacity = 0.3,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const c = useCanvas();

  // --- Responsive sizing via useCanvas ---
  const areaWidth = width ?? c.width;
  const areaHeight = height ?? c.height;

  // --- Coordinate contract: x/y offsets from center ---
  const centerX = c.width / 2 + x;
  const centerY = c.height / 2 + y;

  // =========================================================================
  // Compute circles array (deterministic, index-based)
  // =========================================================================
  const circles = useMemo(() => {
    const t = adjustedFrame / 30; // time in seconds (30fps)
    const sizeRange = Math.max(maxSize - minSize, 1);
    const opacityRange = Math.max(maxOpacity - minOpacity, 0.01);

    return Array.from({ length: circleCount }, (_, i) => {
      // Deterministic base position (0-1 normalized)
      const baseX = ((i * 173 + 53) % 100) / 100;
      const baseY = ((i * 241 + 97) % 100) / 100;

      // Slow drift using sin/cos waves at different phases
      const driftX = Math.sin(t * 0.2 * speed + i * 1.3) * 30;
      const driftY = Math.cos(t * 0.15 * speed + i * 0.9) * 25;

      // Absolute position within the area
      const px = baseX * areaWidth + driftX;
      const py = baseY * areaHeight + driftY;

      // Base size from index
      const baseSize = minSize + ((i * 37 + 11) % sizeRange);

      // Gentle pulse
      const pulse = Math.sin(t * 0.4 * speed + i * 0.7) * 0.2 + 1;
      const size = baseSize * pulse;

      // Deterministic opacity
      const opacity = minOpacity + (((i * 19 + 7) % Math.round(opacityRange * 100)) / 100);

      // Color cycling
      const rgb = colors[i % colors.length];

      return { x: px, y: py, size, opacity, rgb, key: i };
    });
  }, [
    circleCount, adjustedFrame, areaWidth, areaHeight,
    minSize, maxSize, speed, minOpacity, maxOpacity, colors,
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
        ...(style as React.CSSProperties),
      }}
    >
      {circles.map((circle) => (
        <div
          key={circle.key}
          style={{
            position: 'absolute',
            left: `${circle.x}px`,
            top: `${circle.y}px`,
            width: circle.size,
            height: circle.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${circle.rgb[0]}, ${circle.rgb[1]}, ${circle.rgb[2]}, ${circle.opacity + 0.1}) 0%, rgba(${circle.rgb[0]}, ${circle.rgb[1]}, ${circle.rgb[2]}, 0) 70%)`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

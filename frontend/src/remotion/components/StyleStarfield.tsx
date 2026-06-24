/**
 * StyleStarfield — Starfield/space effect with configurable star count,
 * movement patterns (radial/random/directional), colors, and area dimensions.
 *
 * Deterministic: all animations driven by useCurrentFrame().
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

export interface StyleStarfieldProps extends UniversalProps {
  starCount?: number;
  width?: number;
  height?: number;
  bgColor?: string;
  starColor?: string;
  colorVariation?: boolean;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  cycleLength?: number;
  movement?: 'radial' | 'random' | 'directional';
  direction?: 'left' | 'right' | 'up' | 'down';
  opacityFade?: boolean;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleStarfield: React.FC<StyleStarfieldProps> = ({
  x = 540,
  y = 960,
  starCount = 80,
  width,
  height,
  bgColor = 'transparent',
  starColor = '#ffffff',
  colorVariation = false,
  minSize = 1,
  maxSize = 3,
  speed = 1,
  cycleLength = 150,
  movement = 'radial',
  direction = 'right',
  opacityFade = true,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const c = useCanvas();

  // --- Full-bleed by default; honor an explicit smaller size as a region ---
  const areaWidth = width ?? c.width;
  const areaHeight = height ?? c.height;
  const isRegion = areaWidth < c.width - 1 || areaHeight < c.height - 1;

  // Radial origin = center of the area (container-relative → works full-bleed o región).
  const centerX = areaWidth / 2;
  const centerY = areaHeight / 2;

  // =========================================================================
  // Compute stars array (deterministic, index-based)
  // =========================================================================
  const stars = useMemo(() => {
    return Array.from({ length: starCount }, (_, i) => {
      const baseSize = minSize + ((i * 13 + 5) % (maxSize - minSize + 1));
      const starSpeed = 0.5 + ((i * 7 + 3) % 10) / 10;
      let sx = 0, sy = 0, size = baseSize, opacity = 1;

      if (movement === 'radial') {
        const seedAngle = ((i * 137.508) % 360) * (Math.PI / 180);
        const seedRadius = ((i * 31 + 17) % 50) / 50;
        const rawProgress = ((adjustedFrame * starSpeed + i * 15) % cycleLength) / cycleLength;
        const maxRadius = Math.max(areaWidth, areaHeight) * 0.6;
        const radius = seedRadius * 20 + rawProgress * maxRadius;
        sx = centerX + Math.cos(seedAngle) * radius;
        sy = centerY + Math.sin(seedAngle) * radius;
        const scale = 1 + rawProgress * 2;
        size = baseSize * scale;
        opacity = opacityFade
          ? Math.min(rawProgress * 4, 1) * Math.max(1 - rawProgress * 0.8, 0.2)
          : 1;
      } else if (movement === 'random') {
        const seedX = ((i * 137.508) % areaWidth);
        const seedY = ((i * 97.31) % areaHeight);
        const driftX = Math.sin(adjustedFrame * 0.02 + i) * 20 * starSpeed;
        const driftY = Math.cos(adjustedFrame * 0.015 + i * 2) * 15 * starSpeed;
        sx = seedX + driftX;
        sy = seedY + driftY;
        const twinkle = 0.5 + 0.5 * Math.sin(adjustedFrame * 0.1 + i * 3);
        size = baseSize * (0.8 + twinkle * 0.4);
        opacity = opacityFade ? 0.3 + twinkle * 0.7 : 1;
      } else {
        // directional
        const travelDistance =
          direction === 'left' || direction === 'right'
            ? areaWidth * 1.5
            : areaHeight * 1.5;
        const rawProgress = ((adjustedFrame * starSpeed + i * 10) % cycleLength) / cycleLength;

        if (direction === 'right') {
          sx = -20 + rawProgress * travelDistance;
          sy = ((i * 97.31) % areaHeight);
        } else if (direction === 'left') {
          sx = areaWidth + 20 - rawProgress * travelDistance;
          sy = ((i * 97.31) % areaHeight);
        } else if (direction === 'up') {
          sx = ((i * 137.508) % areaWidth);
          sy = areaHeight + 20 - rawProgress * travelDistance;
        } else {
          sx = ((i * 137.508) % areaWidth);
          sy = -20 + rawProgress * travelDistance;
        }
        size = baseSize * (1 + rawProgress);
        opacity = opacityFade
          ? Math.min(rawProgress * 3, 1) * Math.max(1 - rawProgress * 0.7, 0.3)
          : 1;
      }

      // Color variation: slight hue shift per star
      const starFill = colorVariation
        ? shiftHue(starColor, (i * 37) % 60 - 30)
        : starColor;

      return { x: sx, y: sy, size, opacity, color: starFill, key: i };
    });
  }, [
    starCount, adjustedFrame, areaWidth, areaHeight, centerX, centerY,
    minSize, maxSize, speed, cycleLength, movement, direction,
    opacityFade, starColor, colorVariation,
  ]);

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div
      style={{
        position: 'absolute',
        left: isRegion ? `${x}px` : 0,
        top: isRegion ? `${y}px` : 0,
        transform: isRegion ? 'translate(-50%, -50%)' : undefined,
        width: areaWidth,
        height: areaHeight,
        backgroundColor: bgColor,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: (style?.opacity as number) ?? 1,
        ...style,
      }}
    >
      {stars.map((star) => (
        <div
          key={star.key}
          style={{
            position: 'absolute',
            left: `${star.x}px`,
            top: `${star.y}px`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            backgroundColor: star.color,
            opacity: star.opacity,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Shift the hue of a hex color by a given amount (degrees).
 * Falls back to the original color if parsing fails.
 */
function shiftHue(hex: string, shift: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    h = ((h * 360 + shift) % 360 + 360) % 360;
    // HSL to RGB
    const c2 = (1 - Math.abs(2 * l - 1)) * s;
    const x = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c2 / 2;
    let r2 = 0, g2 = 0, b2 = 0;
    if (h < 60) { r2 = c2; g2 = x; }
    else if (h < 120) { r2 = x; g2 = c2; }
    else if (h < 180) { g2 = c2; b2 = x; }
    else if (h < 240) { g2 = x; b2 = c2; }
    else if (h < 300) { r2 = x; b2 = c2; }
    else { r2 = c2; b2 = x; }
    const toHex = (v: number) =>
      Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
  } catch {
    return hex;
  }
}

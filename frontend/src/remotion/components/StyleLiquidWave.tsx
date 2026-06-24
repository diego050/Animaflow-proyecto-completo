/**
 * StyleLiquidWave — SVG liquid wave with configurable amplitude, speed,
 * frequency, gradient colors, and blur.
 *
 * Deterministic: pure math based on frame + index. No Math.random/Date.now.
 * Coordinate contract: x/y = offsets from canvas center, translate(-50%,-50%).
 */
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

export interface StyleLiquidWaveProps extends UniversalProps {
  numberOfPoints?: number;
  bgColor?: string;
  waveColorStart?: string;
  waveColorEnd?: string;
  amplitude?: number;
  speed?: number;
  frequency?: number;
  blur?: number;
  yOffset?: number;
  style?: Record<string, unknown>;
}

export const StyleLiquidWave: React.FC<StyleLiquidWaveProps> = ({
  x = 540,
  y = 960,
  numberOfPoints = 50,
  bgColor = 'transparent',
  waveColorStart = '#1e3a8a',
  waveColorEnd = '#3b82f6',
  amplitude = 50,
  speed = 0.05,
  frequency = 0.2,
  blur = 10,
  yOffset = 0,
  width,
  height,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // --- Full-bleed by default; honor an explicit smaller size as a region ---
  const compWidth = width ?? c.width;
  const compHeight = height ?? c.height;
  const isRegion = compWidth < c.width - 1 || compHeight < c.height - 1;

  // --- Deterministic wave path ---
  const adjustedFrame = frame;
  const pathD = useMemo(() => {
    const points = Array.from({ length: numberOfPoints + 1 }, (_, i) => {
      const px = (i / numberOfPoints) * compWidth;
      const waveHeight = Math.sin(adjustedFrame * speed + i * frequency) * amplitude;
      const py = compHeight / 2 + yOffset + waveHeight;
      return `${px},${py}`;
    });
    return `M 0,${compHeight} ${points.join(' ')} ${compWidth},${compHeight} Z`;
  }, [adjustedFrame, numberOfPoints, compWidth, compHeight, speed, frequency, amplitude, yOffset]);

  // --- Coordinate contract: center + offset ---
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: isRegion ? `${y}px` : 0,
    left: isRegion ? `${x}px` : 0,
    transform: isRegion ? 'translate(-50%, -50%)' : undefined,
    ...style,
  };

  return (
    <div style={containerStyle}>
      <svg width={compWidth} height={compHeight} style={{ background: bgColor }}>
        <defs>
          <linearGradient id="liquidWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={waveColorStart} />
            <stop offset="100%" stopColor={waveColorEnd} />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          fill="url(#liquidWaveGradient)"
          style={{ filter: `blur(${blur}px)` }}
        />
      </svg>
    </div>
  );
};

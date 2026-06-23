/**
 * StyleSoundWave — Sound wave visualization with two variants:
 *   'line' — continuous sine wave (SVG path, multi-frequency layers)
 *   'bars'  — individual equalizer bars that grow/shrink organically
 *
 * Deterministic: all animations driven by useCurrentFrame().
 * Per-bar variation uses Remotion's random(i) (deterministic seed).
 * Coordinate contract: x/y are offsets from canvas center.
 */
import React, { useMemo } from 'react';
import { random, useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StyleSoundWaveProps extends UniversalProps {
  // Shared
  variant?: 'line' | 'bars';
  glow?: boolean;

  // Line-specific
  lineWidth?: number;
  amplitude?: number;
  points?: number;
  direction?: 'right' | 'left' | 'still';
  speed?: number;

  // Bars-specific
  barCount?: number;
  barWidth?: number;
  maxBarHeight?: number;
  gap?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleSoundWave: React.FC<StyleSoundWaveProps> = ({
  x = 0,
  y = 0,
  variant = 'bars',
  color = '#8b5cf6',
  width,
  glow = true,
  // Line defaults
  lineWidth = 6,
  amplitude,
  points = 100,
  direction = 'right',
  speed = 1,
  // Bars defaults
  barCount = 40,
  barWidth,
  maxBarHeight,
  gap,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const c = useCanvas();

  // --- Responsive sizing via useCanvas ---
  const compWidth = width ?? c.vw(70);
  const compAmplitude = amplitude ?? c.vmin(10);
  const compBarWidth = barWidth ?? c.vmin(1.2);
  const compMaxBarHeight = maxBarHeight ?? c.vmin(15);
  const compGap = gap ?? c.vmin(0.4);

  // --- Coordinate contract: x/y offsets from center ---
  const centerX = c.width / 2 + x;
  const centerY = c.height / 2 + y;

  // --- Opacity fade-in ---
  const opacity = Math.min(1, adjustedFrame / 12);

  // =========================================================================
  // LINE VARIANT — continuous sine wave (SVG path)
  // =========================================================================
  const linePath = useMemo(() => {
    const dirSign = direction === 'left' ? -1 : direction === 'still' ? 0 : 1;
    const segments = points;
    let d = `M 0 ${compAmplitude}`;

    for (let i = 0; i <= segments; i++) {
      const xPos = (i / segments) * compWidth;
      const timeOffset = adjustedFrame * 0.1 * speed * dirSign;
      const baseFreq = (i / segments) * Math.PI * 4;

      // Multi-frequency waveform
      const y1 = Math.sin(baseFreq - timeOffset) * compAmplitude * 0.5;
      const y2 = Math.sin(baseFreq * 2.5 + timeOffset * 1.5) * compAmplitude * 0.3;
      const y3 = Math.sin(baseFreq * 0.5 - timeOffset * 0.5) * compAmplitude * 0.2;

      // Envelope to taper ends
      const envelope = Math.sin((i / segments) * Math.PI);
      const yPos = compAmplitude + (y1 + y2 + y3) * envelope;

      d += ` L ${xPos} ${yPos}`;
    }
    return d;
  }, [adjustedFrame, compWidth, compAmplitude, points, speed, direction]);

  // =========================================================================
  // BARS VARIANT — equalizer bars
  // =========================================================================
  const bars = useMemo(() => {
    return Array.from({ length: barCount }).map((_, i) => {
      const seed = i * 1000;
      const baseHeight = Math.abs(Math.sin(adjustedFrame / 10 + i / 2)) * compMaxBarHeight;
      const variation = random(seed) * compMaxBarHeight * 0.5;
      const height = Math.max(4, baseHeight + variation);
      return { height, index: i };
    });
  }, [adjustedFrame, barCount, compMaxBarHeight]);

  const totalBarsWidth = barCount * compBarWidth + (barCount - 1) * compGap;
  const barsStartX = (compWidth - totalBarsWidth) / 2;

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
        width: compWidth,
        height: variant === 'line' ? compAmplitude * 2 : compMaxBarHeight + 20,
        pointerEvents: 'none',
        opacity: opacity * ((style?.opacity as number) ?? 1),
        ...style,
      }}
    >
      {variant === 'line' ? (
        <svg width={compWidth} height={compAmplitude * 2} viewBox={`0 0 ${compWidth} ${compAmplitude * 2}`}>
          {/* Glow layer */}
          {glow && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={lineWidth * 3}
              opacity="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="blur(8px)"
            />
          )}
          {/* Main wave */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%', gap: compGap }}>
          {bars.map((bar) => (
            <div
              key={bar.index}
              style={{
                width: compBarWidth,
                height: bar.height,
                backgroundColor: color,
                borderRadius: compBarWidth / 2,
                boxShadow: glow ? `0 0 ${c.vmin(1)}px ${color}66` : undefined,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

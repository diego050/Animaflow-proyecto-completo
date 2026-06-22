import React from 'react';
import { interpolate, spring, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

interface StyleStatCardProps extends UniversalProps {
  from?: number;
  to?: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  showLabel?: boolean;
  subStatPrimary?: string;
  subStatSecondary?: string;
  subStatColor?: string;
  duration?: number;
  numberSize?: number;
  style?: Record<string, unknown>;
}

export const StyleStatCard: React.FC<StyleStatCardProps> = ({
  x = 0,
  y = 0,
  from = 0,
  to = 1247,
  prefix = '',
  suffix = '',
  label = 'Total Users',
  showLabel = true,
  subStatPrimary,
  subStatSecondary,
  subStatColor = '#22c55e',
  duration = 50,
  numberSize,
  color = '#ffffff',
  bgColor,
  opacity: opacityProp = 1,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Card spring entrance (starts at frame 0) ---
  const cardScale = spring({
    frame: adjustedFrame,
    fps: 30,
    config: { damping: 12, stiffness: 100 },
  });

  // --- Number count animation (frames 10 to 10 + duration) ---
  const countValue = interpolate(
    adjustedFrame,
    [10, 10 + duration],
    [from, to],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
  );
  const displayNumber = Math.round(countValue).toLocaleString();

  // --- Sub-stats fade-in (frames 40-55) ---
  const hasSubStats = !!subStatPrimary || !!subStatSecondary;
  const subStatsOpacity = hasSubStats
    ? interpolate(adjustedFrame, [40, 55], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // --- Layout sizing via useCanvas ---
  const cardPaddingH = c.vmin(5);
  const cardPaddingV = c.vmin(6);
  const numberFontSize = numberSize ?? c.vmin(12);
  const labelFontSize = c.vmin(3);
  const subStatFontSize = c.vmin(2.2);
  const borderRadius = c.vmin(2.4);

  const cardBg = bgColor ?? 'rgba(255, 255, 255, 0.06)';
  const borderColor = 'rgba(255, 255, 255, 0.1)';
  const labelColor = 'rgba(255, 255, 255, 0.7)';
  const subStatSecondaryColor = 'rgba(255, 255, 255, 0.5)';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: `translate(-50%, -50%) scale(${cardScale})`,
        opacity: opacityProp,
        zIndex: 50,
      }}
    >
      {/* Glassmorphic card container */}
      <div
        style={{
          backgroundColor: cardBg,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${borderColor}`,
          borderRadius: `${borderRadius}px`,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          padding: `${cardPaddingV}px ${cardPaddingH}px`,
          textAlign: 'center',
          minWidth: c.vmin(30),
        }}
      >
        {/* Main number */}
        <div
          style={{
            fontSize: `${numberFontSize}px`,
            fontWeight: 800,
            color,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Inter Tight, sans-serif',
          }}
        >
          {prefix}
          {displayNumber}
          {suffix}
        </div>

        {/* Label */}
        {showLabel && label && (
          <div
            style={{
              fontSize: `${labelFontSize}px`,
              color: labelColor,
              marginTop: `${c.vmin(1.5)}px`,
              fontWeight: 500,
              letterSpacing: '0.05em',
              fontFamily: 'Inter, sans-serif',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        )}

        {/* Sub-stats row */}
        {hasSubStats && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: `${c.vmin(3)}px`,
              marginTop: `${c.vmin(2.5)}px`,
              opacity: subStatsOpacity,
            }}
          >
            {subStatPrimary && (
              <span
                style={{
                  color: subStatColor,
                  fontSize: `${subStatFontSize}px`,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {subStatPrimary}
              </span>
            )}
            {subStatSecondary && (
              <span
                style={{
                  color: subStatSecondaryColor,
                  fontSize: `${subStatFontSize}px`,
                  fontWeight: 400,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {subStatSecondary}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

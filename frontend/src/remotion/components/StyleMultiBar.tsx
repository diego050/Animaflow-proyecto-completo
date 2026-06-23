import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MultiBarData {
  label: string;
  value: number;
  color?: string;
}

interface StyleMultiBarProps extends UniversalProps {
  data?: MultiBarData[];
  showTitle?: boolean;
  title?: string;
  showValues?: boolean;
  barHeight?: number;
  maxValue?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#4361ee', '#7209b7', '#f72585', '#4cc9f0', '#a855f7', '#00FFAB', '#FF8C00',
];

const DEFAULT_DATA: MultiBarData[] = [
  { label: 'React', value: 90, color: '#4361ee' },
  { label: 'TypeScript', value: 85, color: '#7209b7' },
  { label: 'Node.js', value: 75, color: '#f72585' },
  { label: 'Python', value: 60, color: '#4cc9f0' },
  { label: 'Go', value: 45, color: '#a855f7' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleMultiBar: React.FC<StyleMultiBarProps> = ({
  x = 0,
  y = 0,
  data = DEFAULT_DATA,
  showTitle = false,
  title = 'Skills Overview',
  showValues = true,
  barHeight,
  maxValue = 100,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Card fade-in (frames 0-15) ---
  const cardOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const customOpacity =
    style?.opacity !== undefined
      ? (style.opacity as number) * cardOpacity
      : cardOpacity;

  // --- Layout sizing (all via useCanvas) ---
  const cardWidth = c.vw(60);
  const cardPadding = c.vmin(4);
  const barH = barHeight ?? c.vmin(2);
  const gap = c.vmin(2.5);
  const labelFont = c.vmin(2.4);
  const valueFont = c.vmin(2.4);
  const titleFont = c.vmin(3);
  const borderRadius = c.vmin(1);

  // --- Pre-compute segments with colors ---
  const segments = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        index: i,
        color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      })),
    [data],
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        opacity: customOpacity,
        zIndex: 50,
        width: cardWidth,
        background: 'rgba(30, 41, 59, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: c.vmin(2.4),
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        padding: cardPadding,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {/* Title */}
      {showTitle && (
        <span
          style={{
            fontFamily: 'Inter Tight, sans-serif',
            fontSize: titleFont,
            fontWeight: 700,
            color: '#F1F5F9',
            textAlign: 'center',
            letterSpacing: c.vmin(0.15),
            opacity: interpolate(adjustedFrame, [20, 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {title}
        </span>
      )}

      {/* Bars */}
      {segments.map((seg) => {
        const labelStart = adjustedFrame - seg.index * 8;
        const labelOpacity = interpolate(labelStart, [0, 5], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const barStart = adjustedFrame - (5 + seg.index * 8);
        const barProgress = interpolate(barStart, [0, 20], [0, seg.value], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });

        return (
          <div
            key={seg.index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: c.vmin(1),
              opacity: labelOpacity,
            }}
          >
            {/* Label row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: labelFont,
                  fontWeight: 600,
                  color: '#F1F5F9',
                }}
              >
                {seg.label}
              </span>
              {showValues && (
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: valueFont,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {Math.round(barProgress)}%
                </span>
              )}
            </div>

            {/* Bar track + fill */}
            <div
              style={{
                width: '100%',
                height: barH,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(barProgress / maxValue) * 100}%`,
                  height: '100%',
                  backgroundColor: seg.color,
                  borderRadius,
                  boxShadow: `0 0 10px ${seg.color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DonutData {
  label: string;
  value: number;
  color?: string;
}

interface StyleDonutChartProps extends UniversalProps {
  data?: DonutData[];
  showLabels?: boolean;
  showTitle?: boolean;
  title?: string;
  centerValue?: number;
  centerLabel?: string;
  centerSuffix?: string;
  showBackgroundRing?: boolean;
  ringColor?: string;
  strokeWidth?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#4361ee', '#7209b7', '#f72585', '#4cc9f0', '#a855f7', '#00FFAB', '#FF8C00',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleDonutChart: React.FC<StyleDonutChartProps> = ({
  x = 0,
  y = 0,
  data = [
    { label: 'Completed', value: 40, color: '#4361ee' },
    { label: 'In Progress', value: 25, color: '#7209b7' },
    { label: 'Pending', value: 20, color: '#f72585' },
    { label: 'Remaining', value: 15, color: '#4cc9f0' },
  ],
  showLabels = true,
  showTitle = false,
  title = 'Completion Rate',
  centerValue,
  centerLabel,
  centerSuffix = '%',
  showBackgroundRing = true,
  ringColor = 'rgba(255,255,255,0.05)',
  strokeWidth,
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
  const cardWidth = c.vw(52);
  const cardPadding = c.vmin(3);
  const chartSize = c.vmin(30);
  const chartCenter = chartSize / 2;
  const radius = chartSize / 2 - c.vmin(2);
  const sw = strokeWidth ?? c.vmin(2.2);
  const circumference = 2 * Math.PI * radius;

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  // --- Center number ---
  const centerTarget = centerValue ?? data[0]?.value ?? 0;
  const centerNum = Math.round(
    interpolate(adjustedFrame, [10, 50], [0, centerTarget], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // --- Pre-compute segments ---
  const segments = useMemo(() => {
    let cum = 0;
    return data.map((d, i) => {
      const pct = d.value / total;
      const offset = cum * circumference;
      cum += pct * circumference;
      return {
        ...d,
        index: i,
        pct,
        offset,
        color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      };
    });
  }, [data, total, circumference]);

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
        alignItems: 'center',
        gap: c.vmin(2),
      }}
    >
      {/* Title */}
      {showTitle && (
        <span
          style={{
            fontFamily: 'Inter Tight, sans-serif',
            fontSize: c.vmin(2.8),
            fontWeight: 700,
            color: '#F1F5F9',
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

      {/* Donut chart */}
      <svg width={chartSize} height={chartSize}>
        {/* Background ring */}
        {showBackgroundRing && (
          <circle
            cx={chartCenter}
            cy={chartCenter}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={sw}
          />
        )}

        {/* Segments */}
        {segments.map((seg) => {
          const segLen = seg.pct * circumference;
          const segStart = adjustedFrame - (12 + seg.index * 12);
          const segProgress = interpolate(segStart, [0, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const animatedLen = segLen * segProgress;

          return (
            <circle
              key={seg.index}
              cx={chartCenter}
              cy={chartCenter}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${animatedLen} ${circumference - animatedLen}`}
              strokeDashoffset={-seg.offset}
              transform={`rotate(-90 ${chartCenter} ${chartCenter})`}
            />
          );
        })}

        {/* Center number */}
        <text
          x={chartCenter}
          y={chartCenter - c.vmin(1.5)}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: 'Inter Tight, sans-serif',
            fontSize: c.vmin(5),
            fontWeight: 800,
            fill: '#F1F5F9',
          }}
        >
          {centerNum}
          {centerSuffix}
        </text>

        {/* Center label */}
        {centerLabel && (
          <text
            x={chartCenter}
            y={chartCenter + c.vmin(3.5)}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: c.vmin(2.2),
              fill: 'rgba(255,255,255,0.6)',
            }}
          >
            {centerLabel}
          </text>
        )}
      </svg>

      {/* Legend */}
      {showLabels && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: c.vmin(1.4),
            justifyContent: 'center',
            maxWidth: c.vw(46),
          }}
        >
          {segments.map((seg) => {
            const legStart = adjustedFrame - (5 + seg.index * 12);
            const legOpacity = interpolate(legStart, [0, 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={seg.index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: c.vmin(1),
                  opacity: legOpacity,
                }}
              >
                <div
                  style={{
                    width: c.vmin(1.8),
                    height: c.vmin(1.8),
                    borderRadius: c.vmin(0.5),
                    backgroundColor: seg.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: c.vmin(2.2),
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {seg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

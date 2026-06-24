import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PieData {
  label: string;
  value: number;
  color?: string;
}

interface StylePieChartProps extends UniversalProps {
  data?: PieData[];
  showLabels?: boolean;
  showValues?: boolean;
  showTitle?: boolean;
  title?: string;
  variant?: 'pie' | 'donut';
  innerRadius?: number;
  explodeSlice?: number;
  centerText?: string;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#00FFAB', '#FF8C00', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#4CC9F0',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StylePieChart: React.FC<StylePieChartProps> = ({
  x = 540,
  y = 960,
  data = [
    { label: 'Video', value: 73, color: '#00FFAB' },
    { label: 'Texto', value: 18, color: '#FF8C00' },
    { label: 'Audio', value: 9, color: '#3B82F6' },
  ],
  showLabels = true,
  showValues = true,
  showTitle = false,
  title = 'Market Share',
  variant = 'donut',
  innerRadius,
  explodeSlice = -1,
  centerText,
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
  const cardWidth = c.vw(56);
  const cardPadding = c.vmin(3);
  const chartSize = c.vmin(32);
  const chartCenter = chartSize / 2;
  const radius = chartSize / 2 - c.vmin(2);
  const ir = variant === 'donut' ? (innerRadius ?? radius * 0.58) : 0;
  const strokeWidth = c.vmin(2.2);
  const labelFont = c.vmin(2.4);
  const titleFont = c.vmin(3);
  const explodeOffset = c.vmin(2.5);
  const circumference = 2 * Math.PI * radius;

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  // --- Pre-compute segment geometry ---
  const segments = useMemo(() => {
    let cum = 0;
    return data.map((d, i) => {
      const pct = d.value / total;
      const startAngle = cum * 360;
      cum += pct;
      const endAngle = cum * 360;
      return {
        ...d,
        index: i,
        pct,
        startAngle,
        endAngle,
        color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      };
    });
  }, [data, total]);

  // --- Pie path helper ---
  const arcPath = (
    startDeg: number,
    endDeg: number,
    r: number,
    innerR: number,
    progress: number,
  ): string => {
    const sweep = (endDeg - startDeg) * progress;
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = ((startDeg + sweep) * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;

    const ox = chartCenter;
    const oy = chartCenter;

    if (innerR > 0) {
      // Donut: outer arc → inner arc → close
      const x1 = ox + r * Math.cos(startRad);
      const y1 = oy + r * Math.sin(startRad);
      const x2 = ox + r * Math.cos(endRad);
      const y2 = oy + r * Math.sin(endRad);
      const ix1 = ox + innerR * Math.cos(startRad);
      const iy1 = oy + innerR * Math.sin(startRad);
      const ix2 = ox + innerR * Math.cos(endRad);
      const iy2 = oy + innerR * Math.sin(endRad);
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    }
    // Pie: center → outer arc → close
    const x1 = ox + r * Math.cos(startRad);
    const y1 = oy + r * Math.sin(startRad);
    const x2 = ox + r * Math.cos(endRad);
    const y2 = oy + r * Math.sin(endRad);
    return `M ${ox} ${oy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
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
            fontSize: titleFont,
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

      {/* Chart */}
      <svg width={chartSize} height={chartSize}>
        {variant === 'donut' ? (
          /* ---- Donut: strokeDasharray technique ---- */
          segments.map((seg) => {
            const segLen = seg.pct * circumference;
            const segStart = adjustedFrame - (10 + seg.index * 8);
            const segProgress = interpolate(segStart, [0, 20], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            });
            const animatedLen = segLen * segProgress;

            // Explode offset
            const isExploded = explodeSlice === seg.index;
            const midDeg = seg.startAngle + (seg.pct * 360 * segProgress) / 2;
            const midRad = (midDeg * Math.PI) / 180;
            const tx = isExploded ? explodeOffset * Math.cos(midRad) : 0;
            const ty = isExploded ? explodeOffset * Math.sin(midRad) : 0;

            return (
              <circle
                key={seg.index}
                cx={chartCenter}
                cy={chartCenter}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${animatedLen} ${circumference - animatedLen}`}
                strokeDashoffset={-(seg.startAngle / 360) * circumference}
                strokeLinecap="round"
                transform={`translate(${tx}, ${ty}) rotate(-90 ${chartCenter} ${chartCenter})`}
              />
            );
          })
        ) : (
          /* ---- Pie: SVG path arcs ---- */
          segments.map((seg) => {
            const segStart = adjustedFrame - (10 + seg.index * 8);
            const segProgress = interpolate(segStart, [0, 20], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.cubic),
            });

            const isExploded = explodeSlice === seg.index;
            const midDeg = seg.startAngle + (seg.pct * 360 * segProgress) / 2;
            const midRad = (midDeg * Math.PI) / 180;
            const tx = isExploded ? explodeOffset * Math.cos(midRad) : 0;
            const ty = isExploded ? explodeOffset * Math.sin(midRad) : 0;

            return (
              <path
                key={seg.index}
                d={arcPath(seg.startAngle, seg.endAngle, radius, ir, segProgress)}
                fill={seg.color}
                stroke="#0F172A"
                strokeWidth={c.vmin(0.4)}
                transform={`translate(${tx}, ${ty})`}
              />
            );
          })
        )}

        {/* Donut center */}
        {variant === 'donut' && (
          <>
            <circle
              cx={chartCenter}
              cy={chartCenter}
              r={ir - c.vmin(0.5)}
              fill="rgba(15, 23, 42, 0.6)"
            />
            {centerText && (
              <text
                x={chartCenter}
                y={chartCenter}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontFamily: 'Inter Tight, sans-serif',
                  fontSize: c.vmin(4),
                  fontWeight: 800,
                  fill: '#F1F5F9',
                }}
              >
                {centerText}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Legend */}
      {(showLabels || showValues) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: c.vmin(1.4),
            justifyContent: 'center',
            maxWidth: c.vw(50),
          }}
        >
          {segments.map((seg) => {
            const legStart = adjustedFrame - (5 + seg.index * 8);
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
                    fontSize: labelFont,
                    color: '#94A3B8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {showLabels && seg.label}
                  {showValues && ` ${seg.value}%`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

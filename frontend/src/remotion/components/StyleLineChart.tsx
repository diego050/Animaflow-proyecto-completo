import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

interface PointData {
  x: string;
  y: number;
}

interface StyleLineChartProps extends UniversalProps {
  data?: PointData[];
  showDots?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  showTitle?: boolean;
  showYAxisLabels?: boolean;
  showAxisLines?: boolean;
  title?: string;
  lineColor?: string;
  lineColorEnd?: string;
  fillColor?: string;
  fillArea?: boolean;
  lineWidth?: number;
  yAxisValues?: number[];
  yAxisFormat?: string;
  style?: Record<string, unknown>;
}

export const StyleLineChart: React.FC<StyleLineChartProps> = ({
  x = 0,
  y = 0,
  data = [
    { x: 'Ene', y: 45 },
    { x: 'Feb', y: 73 },
    { x: 'Mar', y: 55 },
    { x: 'Abr', y: 91 },
  ],
  showDots = true,
  showGrid = true,
  showLabels = true,
  showTitle = false,
  showYAxisLabels = false,
  showAxisLines = false,
  title = 'Growth Trend',
  lineColor = '#00FFAB',
  lineColorEnd = '#4361ee',
  fillColor = 'rgba(0, 255, 171, 0.08)',
  fillArea = true,
  lineWidth,
  yAxisValues = [0, 25, 50, 75, 100],
  yAxisFormat = '{value}',
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Sizing (all via useCanvas) ---
  const cardW = c.vw(72);
  const cardH = c.vmin(36);
  const pad = c.vmin(5);
  const titleH = showTitle ? c.vmin(4) : 0;
  const chartTop = pad + titleH;
  const chartH = cardH - pad - chartTop - c.vmin(3); // leave room for labels
  const strokeW = lineWidth ?? c.vmin(0.6);
  const labelFont = c.vmin(2.4);
  const titleFont = c.vmin(3);
  const dotR = c.vmin(1);
  const dotInner = c.vmin(0.55);

  // --- Animations ---
  const cardOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineProgress = interpolate(adjustedFrame, [5, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const titleOpacity = interpolate(adjustedFrame, [20, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- Computed geometry ---
  const maxVal = Math.max(...data.map((d) => d.y));
  const minVal = Math.min(...data.map((d) => d.y));
  const range = maxVal - minVal || 1;

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        px: pad + (i / (data.length - 1)) * (cardW - pad * 2),
        py: chartTop + (1 - (d.y - minVal) / range) * chartH,
        label: d.x,
        value: d.y,
      })),
    [data, cardW, pad, chartTop, chartH, minVal, range],
  );

  const linePath = useMemo(
    () => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' '),
    [points],
  );
  const areaPath = useMemo(
    () =>
      linePath +
      ` L${points[points.length - 1].px},${chartTop + chartH} L${points[0].px},${chartTop + chartH} Z`,
    [linePath, points, chartTop, chartH],
  );

  const dashLen = cardW * 3;
  const customOpacity =
    style?.opacity !== undefined
      ? (style.opacity as number) * cardOpacity
      : cardOpacity;
  const customLineColor = (style?.color as string) ?? lineColor;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        opacity: customOpacity,
        zIndex: 50,
        width: cardW,
        height: cardH,
        background: 'rgba(30, 41, 59, 0.55)',
        backdropFilter: 'blur(12px)',
        borderRadius: c.vmin(2.5),
        border: `1px solid rgba(51, 65, 85, 0.6)`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.35)`,
        overflow: 'hidden',
      }}
    >
      <svg width={cardW} height={cardH}>
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={customLineColor} />
            <stop offset="100%" stopColor={lineColorEnd} />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor="rgba(0,255,171,0)" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={c.vmin(0.8)} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="lc-area-clip">
            <rect
              x={pad}
              y={chartTop}
              width={(cardW - pad * 2) * lineProgress}
              height={chartH}
            />
          </clipPath>
        </defs>

        {/* Title */}
        {showTitle && (
          <text
            x={cardW / 2}
            y={c.vmin(3.5)}
            textAnchor="middle"
            fontFamily="Inter Tight, sans-serif"
            fontSize={titleFont}
            fontWeight={700}
            fill="#E2E8F0"
            opacity={titleOpacity}
          >
            {title}
          </text>
        )}

        {/* Grid */}
        {showGrid &&
          [0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line
              key={`g-${i}`}
              x1={pad}
              y1={chartTop + pct * chartH}
              x2={cardW - pad}
              y2={chartTop + pct * chartH}
              stroke="#334155"
              strokeWidth={c.vmin(0.15)}
              strokeDasharray={`${c.vmin(0.8)} ${c.vmin(0.6)}`}
              opacity={0.5}
            />
          ))}

        {/* Y-axis labels */}
        {showYAxisLabels &&
          [0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const rawValue = yAxisValues[i] ?? 0;
            const formatted = yAxisFormat.replace('{value}', String(rawValue));
            return (
              <text
                key={`y-${i}`}
                x={pad - c.vmin(1.5)}
                y={chartTop + pct * chartH + labelFont / 2}
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
                fontSize={labelFont}
                fill="#64748B"
              >
                {formatted}
              </text>
            );
          })}

        {/* Axis lines */}
        {showAxisLines && (
          <>
            {/* X-axis */}
            <line
              x1={pad}
              y1={chartTop + chartH}
              x2={cardW - pad}
              y2={chartTop + chartH}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={c.vmin(0.3)}
            />
            {/* Y-axis */}
            <line
              x1={pad}
              y1={chartTop}
              x2={pad}
              y2={chartTop + chartH}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={c.vmin(0.3)}
            />
          </>
        )}

        {/* Area fill — revealed left-to-right via clipPath */}
        {fillArea && (
          <path d={areaPath} fill="url(#areaGrad)" clipPath="url(#lc-area-clip)" />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashLen}
          strokeDashoffset={dashLen * (1 - lineProgress)}
          filter="url(#glow)"
        />

        {/* Dots */}
        {showDots &&
          points.map((p, i) => {
            const dotStart = 10 + i * 5;
            const dotScale = interpolate(adjustedFrame, [dotStart, dotStart + 8], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.out(Easing.back(1.5)),
            });
            return (
              <g
                key={`d-${i}`}
                style={{
                  transform: `scale(${dotScale})`,
                  transformOrigin: `${p.px}px ${p.py}px`,
                }}
              >
                <circle cx={p.px} cy={p.py} r={dotR} fill={customLineColor} />
                <circle cx={p.px} cy={p.py} r={dotInner} fill="#0F172A" />
              </g>
            );
          })}

        {/* X-axis labels */}
        {showLabels &&
          points.map((p, i) => (
            <text
              key={`l-${i}`}
              x={p.px}
              y={cardH - c.vmin(1.2)}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize={labelFont}
              fill="#94A3B8"
            >
              {p.label}
            </text>
          ))}
      </svg>
    </div>
  );
};

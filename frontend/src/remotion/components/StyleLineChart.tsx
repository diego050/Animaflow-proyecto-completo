import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface PointData {
  x: string;
  y: number;
}

interface StyleLineChartProps extends UniversalProps {
  data?: PointData[];
  showDots?: boolean;
  showGrid?: boolean;
  showLabels?: boolean;
  lineColor?: string;
  fillColor?: string;
  fillArea?: boolean;
  lineWidth?: number;
  style?: Record<string, unknown>;
}

export const StyleLineChart: React.FC<StyleLineChartProps> = ({
  x = 540,
  y = 960,
  data = [
    { x: 'Ene', y: 45 },
    { x: 'Feb', y: 73 },
    { x: 'Mar', y: 55 },
    { x: 'Abr', y: 91 },
  ],
  showDots = true,
  showGrid = true,
  showLabels = true,
  lineColor = '#00FFAB',
  fillColor = 'rgba(0, 255, 171, 0.1)',
  fillArea = true,
  lineWidth = 3,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const chartOpacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chartWidth = 360;
  const chartHeight = 200;
  const padding = 40;
  const maxVal = Math.max(...data.map(d => d.y));
  const minVal = Math.min(...data.map(d => d.y));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    px: padding + (i / (data.length - 1)) * (chartWidth - padding * 2),
    py: padding + (1 - (d.y - minVal) / range) * (chartHeight - padding * 2),
    label: d.x,
    value: d.y,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px},${p.py}`).join(' ');
  const areaPath = linePath + ` L${points[points.length - 1].px},${chartHeight - padding} L${points[0].px},${chartHeight - padding} Z`;

  // Animate line drawing
  const lineProgress = interpolate(adjustedFrame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * chartOpacity : chartOpacity;
  const customLineColor = style?.color ?? lineColor;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity: customOpacity, zIndex: 50, width: chartWidth, height: chartHeight }}>
      <svg width={chartWidth} height={chartHeight}>
        {/* Grid */}
        {showGrid && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <line key={i} x1={padding} y1={padding + pct * (chartHeight - padding * 2)} x2={chartWidth - padding} y2={padding + pct * (chartHeight - padding * 2)} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            ))}
          </>
        )}

        {/* Fill area */}
        {fillArea && (
          <path d={areaPath} fill={fillColor} opacity={lineProgress} />
        )}

        {/* Line */}
        <path d={linePath} fill="none" stroke={customLineColor} strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1000} strokeDashoffset={1000 * (1 - lineProgress)} />

        {/* Dots */}
        {showDots && points.map((p, i) => {
          const dotDelay = (i / data.length) * 40;
          const dotFrame = Math.max(0, adjustedFrame - dotDelay);
          const dotScale = interpolate(dotFrame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) });
          return (
            <g key={i} style={{ transform: `scale(${dotScale})`, transformOrigin: `${p.px}px ${p.py}px` }}>
              <circle cx={p.px} cy={p.py} r="5" fill={customLineColor} />
              <circle cx={p.px} cy={p.py} r="3" fill="#0F172A" />
            </g>
          );
        })}

        {/* Labels */}
        {showLabels && points.map((p, i) => (
          <text key={i} x={p.px} y={chartHeight - 10} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fill="#94A3B8">{p.label}</text>
        ))}
      </svg>
    </div>
  );
};

import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
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
  lineWidth,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const chartOpacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Relativo al lienzo (antes px de escala web: 360×200, padding 40, fontSize 11).
  const chartWidth = c.vw(78);
  const chartHeight = c.vmin(38);
  const padding = c.vmin(7);
  const strokeW = lineWidth ?? c.vmin(0.7);
  const labelFont = c.vmin(2.8);
  const dotR = c.vmin(1.1);
  const dotInner = c.vmin(0.7);

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

  // Animate line drawing (dash mayor que cualquier longitud de path posible).
  const lineProgress = interpolate(adjustedFrame, [0, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const dash = chartWidth * 3;

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * chartOpacity : chartOpacity;
  const customLineColor = (style?.color as string) ?? lineColor;

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
        <path d={linePath} fill="none" stroke={customLineColor} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} strokeDashoffset={dash * (1 - lineProgress)} />

        {/* Dots */}
        {showDots && points.map((p, i) => {
          const dotDelay = (i / data.length) * 40;
          const dotFrame = Math.max(0, adjustedFrame - dotDelay);
          const dotScale = interpolate(dotFrame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) });
          return (
            <g key={i} style={{ transform: `scale(${dotScale})`, transformOrigin: `${p.px}px ${p.py}px` }}>
              <circle cx={p.px} cy={p.py} r={dotR} fill={customLineColor} />
              <circle cx={p.px} cy={p.py} r={dotInner} fill="#0F172A" />
            </g>
          );
        })}

        {/* Labels */}
        {showLabels && points.map((p, i) => (
          <text key={i} x={p.px} y={chartHeight - c.vmin(2)} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize={labelFont} fill="#94A3B8">{p.label}</text>
        ))}
      </svg>
    </div>
  );
};

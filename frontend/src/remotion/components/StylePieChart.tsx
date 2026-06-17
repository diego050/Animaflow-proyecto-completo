import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface PieData {
  label: string;
  value: number;
  color?: string;
}

interface StylePieChartProps extends UniversalProps {
  data?: PieData[];
  showLabels?: boolean;
  showValues?: boolean;
  variant?: 'pie' | 'donut';
  innerRadius?: number;
  explodeSlice?: number;
  style?: Record<string, unknown>;
}

const defaultColors = ['#00FFAB', '#FF8C00', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

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
  variant = 'donut',
  innerRadius,
  explodeSlice = 0,
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

  // Relativo al lienzo (antes px de escala web: size 160, fontSize 11).
  const size = c.vmin(46);
  const center = size / 2;
  const radius = size / 2 - c.vmin(3);
  const ir = variant === 'donut' ? (innerRadius ?? size * 0.28) : 0;
  const labelFont = c.vmin(2.8);
  const explodeOffsetBase = c.vmin(1.6);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * chartOpacity : chartOpacity;

  let cumulativePercent = 0;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity: customOpacity, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: c.vmin(2.4) }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((slice, i) => {
          const percent = slice.value / total;
          const startAngle = cumulativePercent * 360;
          cumulativePercent += percent;
          const endAngle = cumulativePercent * 360;

          const sliceDelay = i * 8;
          const sliceFrame = Math.max(0, adjustedFrame - sliceDelay);
          const sliceProgress = interpolate(sliceFrame, [0, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = ((startAngle + percent * 360 * sliceProgress) * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          const largeArc = percent * sliceProgress > 0.5 ? 1 : 0;

          const ix1 = center + ir * Math.cos(startRad);
          const iy1 = center + ir * Math.sin(startRad);
          const ix2 = center + ir * Math.cos(endRad);
          const iy2 = center + ir * Math.sin(endRad);

          const pathData = ir > 0
            ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
            : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const explodeOffset = explodeSlice === i ? explodeOffsetBase : 0;
          const midAngle = ((startAngle + endAngle / sliceProgress) / 2) * (Math.PI / 180);
          const tx = explodeOffset * Math.cos(midAngle);
          const ty = explodeOffset * Math.sin(midAngle);

          return (
            <path
              key={i}
              d={pathData}
              fill={slice.color ?? defaultColors[i % defaultColors.length]}
              transform={`translate(${tx}, ${ty})`}
              stroke="#0F172A"
              strokeWidth={c.vmin(0.4)}
            />
          );
        })}
      </svg>

      {/* Legend */}
      {(showLabels || showValues) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: c.vmin(1.6), justifyContent: 'center', maxWidth: c.vw(72) }}>
          {data.map((slice, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: c.vmin(0.8) }}>
              <div style={{ width: c.vmin(2), height: c.vmin(2), borderRadius: c.vmin(0.5), backgroundColor: slice.color ?? defaultColors[i % defaultColors.length] }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: labelFont, color: '#94A3B8' }}>
                {showLabels && slice.label}
                {showValues && ` ${slice.value}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

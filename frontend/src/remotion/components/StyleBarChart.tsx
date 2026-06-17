import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface StyleBarChartProps extends UniversalProps {
  data?: BarData[];
  variant?: 'vertical' | 'horizontal';
  showLabels?: boolean;
  showValues?: boolean;
  maxValue?: number;
  barGap?: number;
  style?: Record<string, unknown>;
}

const defaultColors = ['#00FFAB', '#FF8C00', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

export const StyleBarChart: React.FC<StyleBarChartProps> = ({
  x = 540,
  y = 960,
  data = [
    { label: 'Ene', value: 45 },
    { label: 'Feb', value: 73 },
    { label: 'Mar', value: 91 },
  ],
  variant = 'vertical',
  showLabels = true,
  showValues = true,
  maxValue,
  barGap,
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

  const maxVal = maxValue ?? Math.max(...data.map(d => d.value));
  // Dimensiones relativas al lienzo (antes px de escala web: 360×200, fontSize 12).
  const chartWidth = c.vw(78);
  const chartHeight = c.vmin(38);
  const gap = barGap ?? c.vmin(1.6);
  const labelFont = c.vmin(2.8);
  const valueFont = c.vmin(3);
  const trackRadius = c.vmin(0.9);
  const barWidth = variant === 'vertical' ? (chartWidth - gap * (data.length - 1)) / data.length : chartWidth;
  const barHeight = variant === 'vertical' ? chartHeight : (chartHeight - gap * (data.length - 1)) / data.length;

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * chartOpacity : chartOpacity;

  if (variant === 'horizontal') {
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity: customOpacity, zIndex: 50, width: chartWidth + c.vmin(14), display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {data.map((bar, i) => {
          const barDelay = i * 5;
          const barFrame = Math.max(0, adjustedFrame - barDelay);
          const barWidthAnimated = interpolate(barFrame, [0, 30], [0, (bar.value / maxVal) * chartWidth], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: c.vmin(1.4) }}>
              {showLabels && <span style={{ width: c.vmin(9), fontFamily: 'Inter, sans-serif', fontSize: labelFont, color: '#94A3B8', textAlign: 'right' }}>{bar.label}</span>}
              <div style={{ width: chartWidth, height: barHeight, backgroundColor: '#1E293B', borderRadius: trackRadius, overflow: 'hidden' }}>
                <div style={{ width: `${barWidthAnimated}px`, height: '100%', backgroundColor: bar.color ?? defaultColors[i % defaultColors.length], borderRadius: trackRadius, transition: 'width 0.1s ease' }} />
              </div>
              {showValues && <span style={{ width: c.vmin(7), fontFamily: 'Inter Tight, sans-serif', fontSize: valueFont, fontWeight: 700, color: '#FFFFFF' }}>{bar.value}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical variant
  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity: customOpacity, zIndex: 50, width: chartWidth, height: chartHeight + c.vmin(8), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${gap}px`, height: chartHeight, width: '100%', justifyContent: 'center' }}>
        {data.map((bar, i) => {
          const barDelay = i * 5;
          const barFrame = Math.max(0, adjustedFrame - barDelay);
          const barHeightAnimated = interpolate(barFrame, [0, 30], [0, (bar.value / maxVal) * chartHeight], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: c.vmin(0.8) }}>
              {showValues && <span style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: valueFont, fontWeight: 700, color: '#FFFFFF' }}>{bar.value}</span>}
              <div style={{ width: barWidth, height: chartHeight, backgroundColor: '#1E293B', borderRadius: `${trackRadius}px ${trackRadius}px 0 0`, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${barHeightAnimated}px`, backgroundColor: bar.color ?? defaultColors[i % defaultColors.length], borderRadius: `${trackRadius}px ${trackRadius}px 0 0`, transition: 'height 0.1s ease' }} />
              </div>
              {showLabels && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: labelFont, color: '#94A3B8' }}>{bar.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

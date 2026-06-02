import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

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
  barGap = 12,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const chartOpacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const maxVal = maxValue ?? Math.max(...data.map(d => d.value));
  const chartWidth = 360;
  const chartHeight = 200;
  const barWidth = variant === 'vertical' ? (chartWidth - barGap * (data.length - 1)) / data.length : chartWidth;
  const barHeight = variant === 'vertical' ? chartHeight : (chartHeight - barGap * (data.length - 1)) / data.length;

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * chartOpacity : chartOpacity;

  if (variant === 'horizontal') {
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity: customOpacity, zIndex: 50, width: chartWidth + 60, display: 'flex', flexDirection: 'column', gap: `${barGap}px` }}>
        {data.map((bar, i) => {
          const barDelay = i * 5;
          const barFrame = Math.max(0, adjustedFrame - barDelay);
          const barWidthAnimated = interpolate(barFrame, [0, 30], [0, (bar.value / maxVal) * chartWidth], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showLabels && <span style={{ width: 40, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94A3B8', textAlign: 'right' }}>{bar.label}</span>}
              <div style={{ width: chartWidth, height: barHeight, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${barWidthAnimated}px`, height: '100%', backgroundColor: bar.color ?? defaultColors[i % defaultColors.length], borderRadius: 4, transition: 'width 0.1s ease' }} />
              </div>
              {showValues && <span style={{ width: 30, fontFamily: 'Inter Tight, sans-serif', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{bar.value}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical variant
  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity: customOpacity, zIndex: 50, width: chartWidth, height: chartHeight + 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${barGap}px`, height: chartHeight, width: '100%', justifyContent: 'center' }}>
        {data.map((bar, i) => {
          const barDelay = i * 5;
          const barFrame = Math.max(0, adjustedFrame - barDelay);
          const barHeightAnimated = interpolate(barFrame, [0, 30], [0, (bar.value / maxVal) * chartHeight], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {showValues && <span style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{bar.value}</span>}
              <div style={{ width: barWidth, height: chartHeight, backgroundColor: '#1E293B', borderRadius: '4px 4px 0 0', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${barHeightAnimated}px`, backgroundColor: bar.color ?? defaultColors[i % defaultColors.length], borderRadius: '4px 4px 0 0', transition: 'height 0.1s ease' }} />
              </div>
              {showLabels && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#94A3B8' }}>{bar.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

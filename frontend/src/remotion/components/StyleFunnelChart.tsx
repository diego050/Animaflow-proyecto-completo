import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface StyleFunnelChartProps extends UniversalProps {
  data?: FunnelStage[];
  showLabels?: boolean;
  showValues?: boolean;
  showPercentages?: boolean;
  style?: Record<string, unknown>;
}

const defaultColors = ['#00FFAB', '#3B82F6', '#FF8C00', '#EF4444', '#8B5CF6'];

export const StyleFunnelChart: React.FC<StyleFunnelChartProps> = ({
  x = 540,
  y = 960,
  data = [
    { label: 'Visitas', value: 10000, color: '#00FFAB' },
    { label: 'Registros', value: 4500, color: '#3B82F6' },
    { label: 'Activaciones', value: 2200, color: '#FF8C00' },
    { label: 'Compras', value: 890, color: '#EF4444' },
    { label: 'Retención', value: 450, color: '#8B5CF6' },
  ],
  showLabels = true,
  showValues = true,
  showPercentages = true,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const maxValue = data[0]?.value ?? 1;
  const chartWidth = 400;
  const stageHeight = 48;
  const gap = 4;
  const totalHeight = data.length * (stageHeight + gap);

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        opacity: customOpacity,
        zIndex: 50,
        width: chartWidth + 120,
      }}
    >
      {data.map((stage, i) => {
        const stageDelay = i * 8;
        const stageFrame = Math.max(0, adjustedFrame - stageDelay);
        const stageProgress = interpolate(stageFrame, [0, 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });

        const widthPercent = stage.value / maxValue;
        const barWidth = chartWidth * widthPercent * stageProgress;
        const leftOffset = (chartWidth - barWidth) / 2;
        const color = stage.color ?? defaultColors[i % defaultColors.length];
        const conversionRate = i > 0 ? ((stage.value / data[i - 1].value) * 100).toFixed(1) : '100';
        const overallRate = ((stage.value / maxValue) * 100).toFixed(1);

        return (
          <div
            key={i}
            style={{
              position: 'relative',
              height: stageHeight + gap,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {showLabels && (
              <span style={{ width: 80, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#E2E8F0', textAlign: 'right', fontWeight: 500 }}>
                {stage.label}
              </span>
            )}
            <div style={{ flex: 1, height: stageHeight, position: 'relative' }}>
              {/* Background track */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#1E293B',
                  borderRadius: 4,
                }}
              />
              {/* Animated bar */}
              <div
                style={{
                  position: 'absolute',
                  left: `${leftOffset}px`,
                  top: 0,
                  width: `${barWidth}px`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: 4,
                  transition: 'width 0.1s ease, left 0.1s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showValues && barWidth > 50 && (
                  <span style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {stage.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            {showPercentages && (
              <span style={{ width: 50, fontFamily: 'Inter Tight, sans-serif', fontSize: 12, fontWeight: 600, color: i === 0 ? '#94A3B8' : '#E2E8F0' }}>
                {i === 0 ? `${overallRate}%` : `${conversionRate}%`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

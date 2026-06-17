import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const maxValue = data[0]?.value ?? 1;
  // Relativo al lienzo (antes px: chartWidth 400, stageHeight 48, fontSize 13/12).
  const chartWidth = c.vw(58);
  const stageHeight = c.vmin(7);
  const gap = c.vmin(0.8);
  const radius = c.vmin(0.8);
  const labelFont = c.vmin(2.8);

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
        width: `${c.vw(84)}px`,
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
              gap: c.vmin(2),
            }}
          >
            {showLabels && (
              <span style={{ width: c.vmin(18), fontFamily: 'Inter, sans-serif', fontSize: labelFont, color: '#E2E8F0', textAlign: 'right', fontWeight: 500 }}>
                {stage.label}
              </span>
            )}
            <div style={{ flex: 1, height: stageHeight, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', backgroundColor: '#1E293B', borderRadius: radius }} />
              <div
                style={{
                  position: 'absolute',
                  left: `${leftOffset}px`,
                  top: 0,
                  width: `${barWidth}px`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: radius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showValues && barWidth > c.vmin(12) && (
                  <span style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: labelFont, fontWeight: 700, color: '#0F172A' }}>
                    {stage.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            {showPercentages && (
              <span style={{ width: c.vmin(11), fontFamily: 'Inter Tight, sans-serif', fontSize: c.vmin(2.6), fontWeight: 600, color: i === 0 ? '#94A3B8' : '#E2E8F0' }}>
                {i === 0 ? `${overallRate}%` : `${conversionRate}%`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

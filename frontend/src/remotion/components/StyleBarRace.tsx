import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface RaceData {
  label: string;
  value: number;
  color?: string;
}

interface StyleBarRaceProps extends UniversalProps {
  data?: RaceData[];
  barHeight?: number;
  gap?: number;
  showLabels?: boolean;
  showValues?: boolean;
  duration?: number;
  style?: Record<string, unknown>;
}

const defaultColors = ['#00FFAB', '#FF8C00', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B'];

export const StyleBarRace: React.FC<StyleBarRaceProps> = ({
  x = 540,
  y = 960,
  data = [
    { label: 'React', value: 85, color: '#3B82F6' },
    { label: 'Vue', value: 65, color: '#14B8A6' },
    { label: 'Angular', value: 45, color: '#EF4444' },
    { label: 'Svelte', value: 35, color: '#FF8C00' },
    { label: 'Solid', value: 25, color: '#8B5CF6' },
  ],
  barHeight = 32,
  gap = 8,
  showLabels = true,
  showValues = true,
  duration = 90,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const progress = interpolate(adjustedFrame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Sort by value and calculate positions
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxVal = Math.max(...data.map(d => d.value));
  const chartWidth = 400;

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
        width: chartWidth + 100,
      }}
    >
      {sorted.map((item, i) => {
        const barWidth = (item.value / maxVal) * chartWidth * progress;
        const color = item.color ?? defaultColors[i % defaultColors.length];

        return (
          <div
            key={item.label}
            style={{
              position: 'relative',
              height: barHeight + gap,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {showLabels && (
              <span style={{ width: 70, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#E2E8F0', textAlign: 'right', fontWeight: 500 }}>
                {item.label}
              </span>
            )}
            <div style={{ flex: 1, height: barHeight, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${barWidth}px`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: 4,
                  transition: 'width 0.1s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                }}
              >
                {showValues && barWidth > 40 && (
                  <span style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                    {item.value}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

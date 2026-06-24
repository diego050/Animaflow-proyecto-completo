import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  barHeight,
  gap,
  showLabels = true,
  showValues = true,
  duration = 90,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
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

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const maxVal = Math.max(...data.map(d => d.value));

  // Relativo al lienzo (antes px: barHeight 32, gap 8, chartWidth 400, fontSize 13/12).
  const bh = barHeight ?? c.vmin(5);
  const g = gap ?? c.vmin(1.4);
  const rowGap = c.vmin(1.4);
  const valueFont = c.vmin(2.8);
  const radius = c.vmin(0.8);

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
        width: `${c.vw(82)}px`,
      }}
    >
      {sorted.map((item, i) => {
        const barWidthPct = (item.value / maxVal) * 100 * progress;
        const color = item.color ?? defaultColors[i % defaultColors.length];

        return (
          <div
            key={item.label}
            style={{
              position: 'relative',
              height: bh + g,
              display: 'flex',
              alignItems: 'center',
              gap: rowGap,
            }}
          >
            {showLabels && (
              <span style={{ width: c.vmin(16), fontFamily: 'Inter, sans-serif', fontSize: c.vmin(3), color: '#E2E8F0', textAlign: 'right', fontWeight: 500 }}>
                {item.label}
              </span>
            )}
            <div style={{ flex: 1, height: bh, backgroundColor: '#1E293B', borderRadius: radius, overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${barWidthPct}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: radius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: c.vmin(1.4),
                }}
              >
                {showValues && barWidthPct > 12 && (
                  <span style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: valueFont, fontWeight: 700, color: '#0F172A' }}>
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

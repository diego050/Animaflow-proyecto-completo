import React from 'react';
import { spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

type BarItem = number | { value: number; label?: string; color?: string };

export const BarChartReveal: React.FC<{
  color1?: string;       // Gradient color (top) / fallback per bar
  color2?: string;       // Gradient color (bottom)
  data?: BarItem[];      // values 0-100, or {value,label,color}
  colors?: string[];     // per-bar colors (overrides gradient)
  labels?: string[];     // x-axis labels
  maxValue?: number;     // scale reference (default 100)
  showValues?: boolean;  // value on top of each bar
  valueColor?: string;
  labelColor?: string;
  axisColor?: string;
  showAxis?: boolean;
  title?: string;
  subtitle?: string;
  titleColor?: string;
  barRadius?: number;
  gap?: number;
  width?: number;
  height?: number;
} & UniversalProps> = ({
  color1 = '#3b82f6',
  color2 = '#0ea5e9',
  data = [30, 50, 75, 45, 90],
  colors,
  labels,
  maxValue = 100,
  showValues = true,
  valueColor = '#ffffff',
  labelColor = 'rgba(255,255,255,0.8)',
  axisColor = 'rgba(255,255,255,0.2)',
  showAxis = true,
  title,
  subtitle,
  titleColor = '#ffffff',
  barRadius,
  gap,
  x = 540,
  y = 960,
  delay = 0,
  width,
  height,
  color,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Normalizar data: número o {value,label,color}.
  const bars = (Array.isArray(data) && data.length > 0 ? data : [0]).map((d, i) => {
    const value = typeof d === 'number' ? d : (d?.value ?? 0);
    const label = (typeof d === 'object' && d?.label) || labels?.[i];
    const barColor = (typeof d === 'object' && d?.color) || colors?.[i];
    return { value, label, barColor };
  });

  const w = width && width > 0 ? width : c.vw(80);
  const h = height && height > 0 ? height : c.vmin(40);
  const g = gap && gap > 0 ? gap : c.vmin(2.4);
  const br = barRadius && barRadius > 0 ? barRadius : c.vmin(2);
  const barWidth = (w - g * (bars.length - 1)) / bars.length;
  const valueFs = c.vmin(2.8);
  const labelFs = c.vmin(2.6);
  const hasLabels = bars.some((b) => b.label);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: `${w}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif', zIndex: 10 }}>
      {title ? <div style={{ fontSize: `${c.vmin(4.5)}px`, fontWeight: 800, color: titleColor, letterSpacing: '-0.5px', marginBottom: subtitle ? `${c.vmin(0.8)}px` : `${c.vmin(2.5)}px`, textAlign: 'center' }}>{title}</div> : null}
      {subtitle ? <div style={{ fontSize: `${c.vmin(2.8)}px`, color: labelColor, marginBottom: `${c.vmin(2.5)}px`, textAlign: 'center' }}>{subtitle}</div> : null}

      {/* Chart area */}
      <div style={{ width: '100%', height: `${h}px`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: `${g}px` }}>
        {bars.map((bar, i) => {
          const progress = spring({ frame: adjustedFrame - i * 4, fps, config: { damping: 14, stiffness: 90 } });
          const currentHeight = Math.max(0, progress * (bar.value / Math.max(1, maxValue)) * h);
          const fill = bar.barColor
            ? bar.barColor
            : `linear-gradient(to top, ${color || color1}, ${color2})`;
          const valueOpacity = interpolate(progress, [0.85, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ width: `${barWidth}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              {showValues ? (
                <span style={{ fontSize: `${valueFs}px`, fontWeight: 700, color: valueColor, opacity: valueOpacity, marginBottom: `${c.vmin(0.8)}px` }}>
                  {Math.round(bar.value)}
                </span>
              ) : null}
              <div style={{ width: '100%', height: `${currentHeight}px`, background: fill, borderTopLeftRadius: `${br}px`, borderTopRightRadius: `${br}px`, boxShadow: `0 ${c.vmin(1.8)}px ${c.vmin(4.5)}px rgba(0,0,0,0.2)` }} />
            </div>
          );
        })}
      </div>

      {/* Axis */}
      {showAxis ? <div style={{ width: '100%', height: `${c.vmin(0.3)}px`, backgroundColor: axisColor, marginTop: `${c.vmin(0.6)}px` }} /> : null}

      {/* X labels */}
      {hasLabels ? (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: `${g}px`, marginTop: `${c.vmin(1.2)}px` }}>
          {bars.map((bar, i) => (
            <div key={i} style={{ width: `${barWidth}px`, textAlign: 'center', fontSize: `${labelFs}px`, fontWeight: 500, color: labelColor }}>{bar.label || ''}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

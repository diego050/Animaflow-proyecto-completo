/**
 * ChapterTitle — Section/chapter intro card: a small uppercase label, a big
 * springing number, a decorative line+dot+line divider that draws outward, and a
 * subtitle that rises in (chapter / section / part / episode title card). Fully
 * atomic: labels, colors, sizes, divider and toggles are all props.
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * Optional full-bleed background. All sizing via useCanvas(). Deterministic.
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface ChapterTitleProps extends UniversalProps {
  label?: string;
  number?: string;
  subtitle?: string;
  labelColor?: string;
  numberColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  numberWeight?: number;
  showLabel?: boolean;
  showDivider?: boolean;
  showSubtitle?: boolean;
  dividerWidth?: number;
  showBackground?: boolean;
  bgColor?: string;
  springDamping?: number;
  springStiffness?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const ChapterTitle: React.FC<ChapterTitleProps> = ({
  x = 540,
  y = 960,
  label = 'Chapter',
  number = '1',
  subtitle = 'The Beginning',
  labelColor = '#9ca3af',
  numberColor = '#ffffff',
  subtitleColor = '#d1d5db',
  accentColor = '#3b82f6',
  numberWeight = 800,
  showLabel = true,
  showDivider = true,
  showSubtitle = true,
  dividerWidth = 120,
  showBackground = true,
  bgColor = '#111827',
  springDamping = 12,
  springStiffness = 80,
  fontSize,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const numberScale = spring({ frame: f, fps, config: { damping: springDamping, stiffness: springStiffness } });
  const labelOpacity = interpolate(f, [5, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineW = interpolate(f, [10, 40], [0, dividerWidth], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subtitleOpacity = interpolate(f, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subtitleY = interpolate(f, [20, 40], [c.vmin(2.5), 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const numberSize = fontSize ?? c.vmin(20);
  const labelSize = c.vmin(2.6);
  const subtitleSize = c.vmin(4);

  const content = (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {showLabel && (
        <div style={{ color: labelColor, fontSize: `${labelSize}px`, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: labelOpacity, marginBottom: `${c.vmin(1)}px` }}>
          {label}
        </div>
      )}

      <div style={{ color: numberColor, fontSize: `${numberSize}px`, fontWeight: numberWeight, lineHeight: 1, transform: `scale(${numberScale})` }}>
        {number}
      </div>

      {showDivider && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${c.vmin(2)}px`, marginTop: `${c.vmin(3)}px`, marginBottom: `${c.vmin(2)}px` }}>
          <div style={{ height: '2px', width: `${lineW}px`, backgroundColor: accentColor }} />
          <div style={{ width: `${c.vmin(1.2)}px`, height: `${c.vmin(1.2)}px`, borderRadius: '50%', backgroundColor: accentColor, opacity: labelOpacity }} />
          <div style={{ height: '2px', width: `${lineW}px`, backgroundColor: accentColor }} />
        </div>
      )}

      {showSubtitle && (
        <div style={{ color: subtitleColor, fontSize: `${subtitleSize}px`, fontWeight: 300, letterSpacing: '0.1em', opacity: subtitleOpacity, transform: `translateY(${subtitleY}px)` }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  if (!showBackground) return content;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: bgColor, zIndex: 0 }} />
      {content}
    </>
  );
};

/**
 * SubscribeReminder — Small corner "subscribe" nudge that slides up: a pulsing
 * bell + a Subscribe label + channel handle, in a frosted pill (subscribe
 * reminder / corner CTA / bell nudge / follow prompt). Overlays the scene (no
 * own background by default). Distinct from SubscribeButton (centered button).
 *
 * Coordinate contract: anchored to a corner (+ x/y px offset). useCanvas sizing.
 * Deterministic: slide-in spring + bell pulse from useCurrentFrame().
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface SubscribeReminderProps extends UniversalProps {
  label?: string;
  handle?: string;
  bellIcon?: string;
  bellColor?: string;
  pillColor?: string;
  labelColor?: string;
  handleColor?: string;
  borderColor?: string;
  corner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  margin?: number;
  showBell?: boolean;
  showHandle?: boolean;
  showBackground?: boolean;
  bgColor?: string;
  appearDelay?: number;
  springDamping?: number;
  springStiffness?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const SubscribeReminder: React.FC<SubscribeReminderProps> = ({
  x = 0,
  y = 0,
  label = 'Subscribe',
  handle = '@CreativeStudio',
  bellIcon = '🔔',
  bellColor = '#3b82f6',
  pillColor = 'rgba(0, 0, 0, 0.75)',
  labelColor = '#ffffff',
  handleColor = '#9ca3af',
  borderColor = 'rgba(255,255,255,0.1)',
  corner = 'bottom-right',
  margin,
  showBell = true,
  showHandle = true,
  showBackground = false,
  bgColor = '#111827',
  appearDelay = 10,
  springDamping = 14,
  springStiffness = 100,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const slideIn = spring({ frame: Math.max(0, f - appearDelay), fps, config: { damping: springDamping, stiffness: springStiffness } });
  const translateY = interpolate(slideIn, [0, 1], [c.vmin(14), 0]);
  const bellPulse = interpolate(Math.sin(f * 0.15), [-1, 1], [1, 1.15]);

  const m = margin ?? c.vmin(3);
  const labelSize = c.vmin(2.3);
  const handleSize = c.vmin(1.7);
  const bell = c.vmin(5);

  // Anclaje a la esquina (+ offset x/y en px).
  const edge: React.CSSProperties = { position: 'absolute' };
  if (corner.includes('bottom')) edge.bottom = `${m - y}px`; else edge.top = `${m + y}px`;
  if (corner.includes('right')) edge.right = `${m - x}px`; else edge.left = `${m + x}px`;

  const pill = (
    <div
      style={{
        ...edge,
        display: 'flex',
        alignItems: 'center',
        gap: `${c.vmin(1.6)}px`,
        backgroundColor: pillColor,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: `${c.vmin(1.6)}px ${c.vmin(2.6)}px`,
        borderRadius: '999px',
        border: `1px solid ${borderColor}`,
        transform: `translateY(${translateY}px)`,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {showBell && (
        <div style={{ width: `${bell}px`, height: `${bell}px`, borderRadius: '50%', backgroundColor: bellColor, display: 'flex', justifyContent: 'center', alignItems: 'center', transform: `scale(${bellPulse})` }}>
          <span style={{ fontSize: `${bell * 0.5}px`, lineHeight: 1 }}>{bellIcon}</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: labelColor, fontSize: `${labelSize}px`, fontWeight: 600 }}>{label}</span>
        {showHandle && <span style={{ color: handleColor, fontSize: `${handleSize}px` }}>{handle}</span>}
      </div>
    </div>
  );

  if (!showBackground) return pill;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: bgColor, zIndex: 0 }} />
      {pill}
    </>
  );
};

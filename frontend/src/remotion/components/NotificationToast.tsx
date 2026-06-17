import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface NotificationToastProps extends UniversalProps {
  title?: string;
  message?: string;
  icon?: string;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  title = 'Payment Received',
  message = '$4,200.00 from Acme Corp',
  icon = '💰',
  color = '#22c55e',
  bgColor = 'rgba(255, 255, 255, 0.9)',
  textColor = '#0f172a',
  x = 540,
  y = 150, // Top of screen
  fontSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 12, mass: 0.8 } });
  const translateY = interpolate(entrance, [0, 1], [-c.vmin(15), 0]);

  // Relativo al lienzo (antes px: width 450, fontSize 20, icon box 60).
  const fs = fontSize ?? c.vmin(3.6);
  const iconBox = c.vmin(10);

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(-50%, ${translateY}px)`, opacity: entrance,
      width: `${c.vw(78)}px`, backgroundColor: bgColor, backdropFilter: 'blur(20px)',
      borderRadius: `${c.vmin(3.2)}px`, padding: `${c.vmin(3)}px`, display: 'flex', alignItems: 'center', gap: `${c.vmin(3)}px`,
      boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
      fontFamily: 'Inter, sans-serif', zIndex: 60,
    }}>
      <div style={{ width: iconBox, height: iconBox, borderRadius: `${c.vmin(2.4)}px`, backgroundColor: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${c.vmin(5)}px`, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: `${c.vmin(0.6)}px` }}>
        <div style={{ fontWeight: 'bold', fontSize: `${fs}px`, color: textColor }}>{title}</div>
        <div style={{ fontSize: `${fs - c.vmin(0.8)}px`, color: '#64748b' }}>{message}</div>
      </div>
      <div style={{ color: '#cbd5e1' }}>
        <svg width={c.vmin(4)} height={c.vmin(4)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </div>
    </div>
  );
};

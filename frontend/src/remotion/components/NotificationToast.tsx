import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

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
  fontSize = 20,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Drops in from top, bounces slightly
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 12, mass: 0.8 } });
  const translateY = interpolate(entrance, [0, 1], [-100, 0]);

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(-50%, ${translateY}px)`, opacity: entrance,
      width: '450px', backgroundColor: bgColor, backdropFilter: 'blur(20px)',
      borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
      fontFamily: 'Inter, sans-serif', zIndex: 60,
    }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '16px', backgroundColor: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontWeight: 'bold', fontSize: `${fontSize}px`, color: textColor }}>{title}</div>
        <div style={{ fontSize: `${fontSize - 4}px`, color: '#64748b' }}>{message}</div>
      </div>
      <div style={{ color: '#cbd5e1' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </div>
    </div>
  );
};

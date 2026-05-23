import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface ShoppingCartBadgeProps extends UniversalProps {
  triggerFrame?: number;
  badgeColor?: string;
  iconColor?: string;
}

export const ShoppingCartBadge: React.FC<ShoppingCartBadgeProps> = ({
  triggerFrame = 60,
  x = 540,
  y = 960,
  badgeColor = '#ef4444',
  iconColor = '#0f172a',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);
  const isAdded = adjustedFrame >= triggerFrame;

  const badgeScale = spring({ frame: Math.max(0, adjustedFrame - triggerFrame), fps, config: { damping: 10, mass: 0.5, stiffness: 200 } });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 55 }}>
      <div style={{ position: 'relative' }}>
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {isAdded && (
          <div style={{
            position: 'absolute', top: '-10px', right: '-10px', width: '40px', height: '40px',
            backgroundColor: badgeColor, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold', fontSize: '24px', transform: `scale(${badgeScale})`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          }}>1</div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface AppStoreButtonsProps extends UniversalProps {
  showApple?: boolean;
  showGoogle?: boolean;
}

export const AppStoreButtons: React.FC<AppStoreButtonsProps> = ({
  showApple = true,
  showGoogle = true,
  bgColor = '#000000',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const scaleApple = spring({ frame: adjustedFrame, fps, config: { damping: 12 } });
  const scaleGoogle = spring({ frame: Math.max(0, adjustedFrame - 10), fps, config: { damping: 12 } });

  // Relativo al lienzo (antes px: gap 30, padding 15/30, fontSize 14/28, svg 40).
  const iconSize = c.vmin(7);
  const smallFont = c.vmin(2.6);
  const bigFont = c.vmin(4.8);
  const pad = `${c.vmin(2.4)}px ${c.vmin(4)}px`;
  const innerGap = `${c.vmin(2)}px`;
  const cardRadius = `${c.vmin(2.4)}px`;

  const renderBtn = (scale: number, line1: string, line2: string, path: string) => (
    <div style={{ transform: `scale(${scale})`, backgroundColor: bgColor, color: textColor, padding: pad, borderRadius: cardRadius, display: 'flex', alignItems: 'center', gap: innerGap, border: '1px solid #333' }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor"><path d={path} /></svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: `${smallFont}px`, opacity: 0.8 }}>{line1}</span>
        <span style={{ fontSize: `${bigFont}px`, fontWeight: 'bold' }}>{line2}</span>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, display: 'flex', gap: `${c.vmin(4)}px`, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', zIndex: 40 }}>
      {showApple && renderBtn(scaleApple, 'Download on the', 'App Store', 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.17 14.5c-.83.5-1.74.52-2.67.52-.94 0-1.84-.02-2.67-.52-1.3-.8-2.17-2.18-2.17-3.8 0-2.3 1.87-4.17 4.17-4.17 1.05 0 2.05.42 2.8 1.17.15.15.15.38 0 .53l-.93.93c-.15.15-.38.15-.53 0-.45-.45-1.07-.7-1.72-.7-1.42 0-2.58 1.16-2.58 2.58 0 1.42 1.16 2.58 2.58 2.58.65 0 1.27-.25 1.72-.7.15-.15.38-.15.53 0l.93.93c.15.15.15.38 0 .53-.75.75-1.75 1.17-2.8 1.17z')}
      {showGoogle && renderBtn(scaleGoogle, 'GET IT ON', 'Google Play', 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z')}
    </div>
  );
};

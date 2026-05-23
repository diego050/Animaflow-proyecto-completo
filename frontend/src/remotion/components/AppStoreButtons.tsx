import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

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
  const adjustedFrame = Math.max(0, frame - delay);

  const scaleApple = spring({ frame: adjustedFrame, fps, config: { damping: 12 } });
  const scaleGoogle = spring({ frame: Math.max(0, adjustedFrame - 10), fps, config: { damping: 12 } });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, display: 'flex', gap: '30px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', zIndex: 40 }}>
      
      {showApple && (
        <div style={{ transform: `scale(${scaleApple})`, backgroundColor: bgColor, color: textColor, padding: '15px 30px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #333' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.17 14.5c-.83.5-1.74.52-2.67.52-.94 0-1.84-.02-2.67-.52-1.3-.8-2.17-2.18-2.17-3.8 0-2.3 1.87-4.17 4.17-4.17 1.05 0 2.05.42 2.8 1.17.15.15.15.38 0 .53l-.93.93c-.15.15-.38.15-.53 0-.45-.45-1.07-.7-1.72-.7-1.42 0-2.58 1.16-2.58 2.58 0 1.42 1.16 2.58 2.58 2.58.65 0 1.27-.25 1.72-.7.15-.15.38-.15.53 0l.93.93c.15.15.15.38 0 .53-.75.75-1.75 1.17-2.8 1.17z"/></svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>Download on the</span>
            <span style={{ fontSize: '28px', fontWeight: 'bold' }}>App Store</span>
          </div>
        </div>
      )}

      {showGoogle && (
        <div style={{ transform: `scale(${scaleGoogle})`, backgroundColor: bgColor, color: textColor, padding: '15px 30px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #333' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>GET IT ON</span>
            <span style={{ fontSize: '28px', fontWeight: 'bold' }}>Google Play</span>
          </div>
        </div>
      )}

    </div>
  );
};

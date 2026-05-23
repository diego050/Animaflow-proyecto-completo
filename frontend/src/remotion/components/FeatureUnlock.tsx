import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface FeatureUnlockProps extends UniversalProps {
  featureName?: string;
}

export const FeatureUnlock: React.FC<FeatureUnlockProps> = ({
  featureName = 'Premium Export 4K',
  color = '#eab308', // Gold
  bgColor = '#0f172a',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Padlock animations
  const lockScale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Unlock pop
  const unlockFrame = Math.max(0, adjustedFrame - 20);
  const unlockPop = spring({ frame: unlockFrame, fps, config: { damping: 10, mass: 0.5 } });
  const lockY = interpolate(unlockPop, [0, 1], [0, -15]); // Shackle moves up
  const lockRotate = interpolate(unlockPop, [0, 1], [0, 30]); // Shackle rotates open

  // Reveal text
  const textOpacity = interpolate(unlockFrame, [10, 20], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const textY = interpolate(unlockFrame, [10, 20], [20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${lockScale})`, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      
      <div style={{ position: 'relative', width: '120px', height: '160px', marginBottom: '20px' }}>
        {/* Shackle */}
        <svg width="80" height="100" viewBox="0 0 100 100" style={{ position: 'absolute', top: `${lockY}px`, left: '20px', transform: `rotate(${lockRotate}deg)`, transformOrigin: 'right bottom' }}>
          <path d="M20 100 V50 A30 30 0 0 1 80 50 V100" fill="none" stroke="#94a3b8" strokeWidth="16" strokeLinecap="round" />
        </svg>
        
        {/* Body */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '80px', backgroundColor: color, borderRadius: '16px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#000000', opacity: 0.2 }} />
        </div>
      </div>
      
      {/* Revealed Text */}
      <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, backgroundColor: bgColor, padding: '15px 30px', borderRadius: '12px', fontSize: '32px', fontWeight: 'bold', color: textColor, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: `2px solid ${color}` }}>
        UNLOCKED: <span style={{ color: color }}>{featureName}</span>
      </div>

    </div>
  );
};

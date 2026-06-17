import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const lockScale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  const unlockFrame = Math.max(0, adjustedFrame - 20);
  const unlockPop = spring({ frame: unlockFrame, fps, config: { damping: 10, mass: 0.5 } });
  const lockY = interpolate(unlockPop, [0, 1], [0, -c.vmin(2.4)]);
  const lockRotate = interpolate(unlockPop, [0, 1], [0, 30]);

  const textOpacity = interpolate(unlockFrame, [10, 20], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const textY = interpolate(unlockFrame, [10, 20], [c.vmin(3), 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  // Relativo al lienzo (antes px: lock 120×160, fontSize 32, padding 15/30).
  const bodyW = c.vmin(18);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${lockScale})`, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      <div style={{ position: 'relative', width: `${bodyW}px`, height: `${c.vmin(24)}px`, marginBottom: `${c.vmin(3)}px` }}>
        {/* Shackle */}
        <svg width={c.vmin(12)} height={c.vmin(15)} viewBox="0 0 100 100" style={{ position: 'absolute', top: `${lockY}px`, left: `${c.vmin(3)}px`, transform: `rotate(${lockRotate}deg)`, transformOrigin: 'right bottom' }}>
          <path d="M20 100 V50 A30 30 0 0 1 80 50 V100" fill="none" stroke="#94a3b8" strokeWidth="16" strokeLinecap="round" />
        </svg>

        {/* Body */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${bodyW}px`, height: `${c.vmin(12)}px`, backgroundColor: color, borderRadius: `${c.vmin(2.4)}px`, boxShadow: '0 10px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ width: c.vmin(3), height: c.vmin(3), borderRadius: '50%', backgroundColor: '#000000', opacity: 0.2 }} />
        </div>
      </div>

      {/* Revealed Text */}
      <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, backgroundColor: bgColor, padding: `${c.vmin(2)}px ${c.vmin(4)}px`, borderRadius: `${c.vmin(2)}px`, fontSize: `${c.vmin(4.4)}px`, fontWeight: 'bold', color: textColor, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: `${c.vmin(0.4)}px solid ${color}` }}>
        UNLOCKED: <span style={{ color }}>{featureName}</span>
      </div>
    </div>
  );
};

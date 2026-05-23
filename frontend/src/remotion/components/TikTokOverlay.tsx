import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface TikTokOverlayProps extends UniversalProps {
  likes?: string;
  comments?: string;
  shares?: string;
  soundName?: string;
}

export const TikTokOverlay: React.FC<TikTokOverlayProps> = ({
  likes = '1.2M',
  comments = '45.2K',
  shares = '12K',
  soundName = 'Original Sound - Creator',
  color = '#fe2c55', // TT Pink
  textColor = '#ffffff',
  x = 900,
  y = 960, // Right bottom side normally
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Pop entrances
  const stagger = (i: number) => spring({ frame: Math.max(0, adjustedFrame - (i * 10)), fps, config: { damping: 12 } });

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 90, fontFamily: 'sans-serif' }}>
      
      {/* Right side buttons */}
      <div style={{ position: 'absolute', right: '40px', bottom: '200px', display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center' }}>
        
        {/* Profile */}
        <div style={{ transform: `scale(${stagger(0)})` }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid #ffffff' }} />
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: '-10px', left: '25px', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>+</div>
        </div>

        {/* Likes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transform: `scale(${stagger(1)})` }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span style={{ color: textColor, fontSize: '24px', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{likes}</span>
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transform: `scale(${stagger(2)})` }}>
          <svg width="55" height="55" viewBox="0 0 24 24" fill="#ffffff"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span style={{ color: textColor, fontSize: '24px', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{comments}</span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transform: `scale(${stagger(3)})` }}>
          <svg width="55" height="55" viewBox="0 0 24 24" fill="#ffffff"><path d="M11 2L2 9h5v8h8V9h5z" transform="rotate(90 12 12)"/></svg>
          <span style={{ color: textColor, fontSize: '24px', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{shares}</span>
        </div>
      </div>

      {/* Bottom text */}
      <div style={{ position: 'absolute', bottom: '60px', left: '40px', right: '160px', opacity: stagger(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <span style={{ color: textColor, fontSize: '24px', fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{soundName}</span>
        </div>
      </div>

    </div>
  );
};

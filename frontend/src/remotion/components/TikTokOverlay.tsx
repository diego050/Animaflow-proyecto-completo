import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const stagger = (i: number) => spring({ frame: Math.max(0, adjustedFrame - i * 10), fps, config: { damping: 12 } });

  // Relativo al lienzo (antes px fijos en un overlay full-screen).
  const statFont = c.vmin(3.6);
  const statGap = c.vmin(1.4);
  const labelShadow = '0 2px 4px rgba(0,0,0,0.5)';

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 90, fontFamily: 'sans-serif' }}>
      {/* Right side buttons */}
      <div style={{ position: 'absolute', right: `${c.vw(5)}px`, bottom: `${c.vh(11)}px`, display: 'flex', flexDirection: 'column', gap: `${c.vmin(5)}px`, alignItems: 'center' }}>
        {/* Profile */}
        <div style={{ transform: `scale(${stagger(0)})`, position: 'relative' }}>
          <div style={{ width: c.vmin(13), height: c.vmin(13), borderRadius: '50%', backgroundColor: '#ffffff', border: '2px solid #ffffff' }} />
          <div style={{ width: c.vmin(5), height: c.vmin(5), borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: `${-c.vmin(1.6)}px`, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: `${c.vmin(4)}px`, fontWeight: 'bold' }}>+</div>
        </div>

        {/* Likes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${statGap}px`, transform: `scale(${stagger(1)})` }}>
          <svg width={c.vmin(9)} height={c.vmin(9)} viewBox="0 0 24 24" fill={color}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          <span style={{ color: textColor, fontSize: `${statFont}px`, fontWeight: 600, textShadow: labelShadow }}>{likes}</span>
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${statGap}px`, transform: `scale(${stagger(2)})` }}>
          <svg width={c.vmin(8.5)} height={c.vmin(8.5)} viewBox="0 0 24 24" fill="#ffffff"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          <span style={{ color: textColor, fontSize: `${statFont}px`, fontWeight: 600, textShadow: labelShadow }}>{comments}</span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${statGap}px`, transform: `scale(${stagger(3)})` }}>
          <svg width={c.vmin(8.5)} height={c.vmin(8.5)} viewBox="0 0 24 24" fill="#ffffff"><path d="M11 2L2 9h5v8h8V9h5z" transform="rotate(90 12 12)" /></svg>
          <span style={{ color: textColor, fontSize: `${statFont}px`, fontWeight: 600, textShadow: labelShadow }}>{shares}</span>
        </div>
      </div>

      {/* Bottom text */}
      <div style={{ position: 'absolute', bottom: `${c.vh(4)}px`, left: `${c.vw(5)}px`, right: `${c.vw(22)}px`, opacity: stagger(4) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1.4)}px` }}>
          <svg width={c.vmin(4)} height={c.vmin(4)} viewBox="0 0 24 24" fill="#ffffff"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          <span style={{ color: textColor, fontSize: `${statFont}px`, fontWeight: 500, textShadow: labelShadow }}>{soundName}</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface MusicPlayerUIProps extends UniversalProps {
  songTitle?: string;
  artist?: string;
  progressColor?: string;
  albumColor?: string;
}

export const MusicPlayerUI: React.FC<MusicPlayerUIProps> = ({
  songTitle = 'Lo-Fi Chill Vibes', artist = 'AnimaFlow Beats',
  x = 540, y = 800,
  progressColor = '#1db954', bgColor = 'rgba(20, 20, 20, 0.85)',
  albumColor = '#f5576c', delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14, mass: 1 } });
  const progressPercent = interpolate(adjustedFrame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' });

  // Relativo al lienzo (antes px: width 600, album 120, fontSize 24/32).
  const album = c.vmin(18);

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(-50%, -50%) scale(${entrance})`,
      width: `${c.vw(82)}px`, backgroundColor: bgColor, backdropFilter: 'blur(20px)',
      borderRadius: `${c.vmin(4.5)}px`, padding: `${c.vmin(4)}px`, boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
      fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(3)}px`, marginBottom: `${c.vmin(3.5)}px` }}>
        <div style={{
          width: album, height: album, borderRadius: `${c.vmin(2.4)}px`,
          background: `linear-gradient(135deg, #f093fb 0%, ${albumColor} 100%)`,
          boxShadow: `0 10px 20px ${albumColor}4d`, flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: `0 0 ${c.vmin(0.8)}px 0`, color: 'white', fontSize: `${c.vmin(4.4)}px`, fontWeight: 'bold' }}>{songTitle}</h2>
          <p style={{ margin: 0, color: '#a3a3a3', fontSize: `${c.vmin(3.4)}px` }}>{artist}</p>
        </div>
      </div>
      <div style={{ marginBottom: `${c.vmin(3)}px` }}>
        <div style={{ width: '100%', height: `${c.vmin(1)}px`, backgroundColor: '#333333', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progressPercent}%`, backgroundColor: progressColor, borderRadius: '999px' }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${c.vmin(6)}px` }}>
        <svg width={c.vmin(5)} height={c.vmin(5)} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
        <div style={{ width: c.vmin(12), height: c.vmin(12), borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
          <svg width={c.vmin(5.5)} height={c.vmin(5.5)} viewBox="0 0 24 24" fill="#000000" stroke="#000000" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        </div>
        <svg width={c.vmin(5)} height={c.vmin(5)} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
      </div>
    </div>
  );
};

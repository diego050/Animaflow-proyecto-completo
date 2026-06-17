import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface YouTubeEndScreenProps extends UniversalProps {
  title?: string;
  subscribeColor?: string;
}

export const YouTubeEndScreen: React.FC<YouTubeEndScreenProps> = ({
  title = 'Thanks for watching!',
  subscribeColor = '#ff0000',
  bgColor = 'rgba(0, 0, 0, 0.8)',
  textColor = '#ffffff',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const bgOp = spring({ frame: adjustedFrame, fps, config: { damping: 20 } });
  const scaleVideos = spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 14 } });
  const scaleSub = spring({ frame: Math.max(0, adjustedFrame - 30), fps, config: { damping: 12, mass: 1.5 } });

  // Relativo al lienzo (antes px: slots 400×225, fontSize 24-64, circle 120).
  const slotW = c.vw(42);
  const slotH = slotW * 0.5625;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: bgColor, opacity: bgOp, zIndex: 100, fontFamily: 'Roboto, Arial, sans-serif' }}>
      {/* Title */}
      <div style={{ position: 'absolute', top: '15%', width: '100%', textAlign: 'center', fontSize: `${c.vmin(7)}px`, fontWeight: 'bold', color: textColor, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        {title}
      </div>

      {/* Video Slots */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: `${c.vw(6)}px` }}>
        <div style={{ width: slotW, height: slotH, backgroundColor: '#333333', border: `${c.vmin(0.6)}px solid #ffffff`, borderRadius: `${c.vmin(2)}px`, transform: `scale(${scaleVideos})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: `${c.vmin(3.2)}px`, opacity: 0.5 }}>Next Video</div>
        </div>
        <div style={{ width: slotW, height: slotH, backgroundColor: '#333333', border: `${c.vmin(0.6)}px solid #ffffff`, borderRadius: `${c.vmin(2)}px`, transform: `scale(${scaleVideos})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: `${c.vmin(3.2)}px`, opacity: 0.5 }}>Recommended</div>
        </div>
      </div>

      {/* Subscribe Button */}
      <div style={{ position: 'absolute', top: '75%', left: '50%', transform: `translate(-50%, -50%) scale(${scaleSub})`, display: 'flex', alignItems: 'center', gap: `${c.vmin(4)}px` }}>
        <div style={{ width: c.vmin(16), height: c.vmin(16), borderRadius: '50%', backgroundColor: '#ffffff', border: `${c.vmin(1)}px solid ${subscribeColor}` }} />
        <div style={{ padding: `${c.vmin(2.6)}px ${c.vmin(5)}px`, backgroundColor: subscribeColor, color: '#ffffff', fontSize: `${c.vmin(4.4)}px`, fontWeight: 'bold', borderRadius: `${c.vmin(1.4)}px`, textTransform: 'uppercase', letterSpacing: '1px' }}>
          SUBSCRIBE
        </div>
      </div>
    </div>
  );
};

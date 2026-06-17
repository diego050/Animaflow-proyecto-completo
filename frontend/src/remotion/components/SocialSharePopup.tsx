import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface SocialSharePopupProps extends UniversalProps {
  title?: string;
}

export const SocialSharePopup: React.FC<SocialSharePopupProps> = ({
  title = 'Share to friends',
  bgColor = '#ffffff',
  textColor = '#0f172a',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const slideUp = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const translateY = interpolate(slideUp, [0, 1], [c.vmin(50), 0]);

  const socialApps = [
    { name: 'Copy Link', bg: '#e2e8f0' },
    { name: 'WhatsApp', bg: '#25D366' },
    { name: 'Twitter', bg: '#1DA1F2' },
    { name: 'Email', bg: '#ef4444' },
  ];

  // Relativo al lienzo (antes px: width 600, fontSize 18-32, app circle 80).
  const appCircle = c.vmin(13);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) translateY(${translateY}px)`, opacity: slideUp, width: `${c.vw(82)}px`, backgroundColor: bgColor, borderRadius: `${c.vmin(3.6)}px`, padding: `${c.vmin(4)}px`, boxShadow: '0 40px 100px rgba(0,0,0,0.3)', fontFamily: 'Inter, sans-serif', zIndex: 80 }}>
      <div style={{ width: c.vmin(8), height: c.vmin(0.9), backgroundColor: '#cbd5e1', borderRadius: '999px', margin: `0 auto ${c.vmin(3)}px auto` }} />

      <div style={{ fontSize: `${c.vmin(4.4)}px`, fontWeight: 'bold', color: textColor, textAlign: 'center', marginBottom: `${c.vmin(5)}px` }}>
        {title}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {socialApps.map((app, idx) => {
          const appScale = spring({ frame: Math.max(0, adjustedFrame - 15 - idx * 5), fps, config: { damping: 12 } });
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${c.vmin(2)}px`, transform: `scale(${appScale})` }}>
              <div style={{ width: appCircle, height: appCircle, borderRadius: '50%', backgroundColor: app.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: c.vmin(5), height: c.vmin(5), backgroundColor: '#ffffff', borderRadius: `${c.vmin(0.8)}px` }} />
              </div>
              <div style={{ fontSize: `${c.vmin(3)}px`, color: '#64748b', fontWeight: 500 }}>{app.name}</div>
            </div>
          );
        })}
      </div>

      {/* Cancel button */}
      <div style={{ marginTop: `${c.vmin(5)}px`, padding: `${c.vmin(3)}px`, backgroundColor: '#f1f5f9', borderRadius: `${c.vmin(2)}px`, textAlign: 'center', fontSize: `${c.vmin(3.4)}px`, fontWeight: 'bold', color: '#64748b' }}>
        Cancel
      </div>
    </div>
  );
};

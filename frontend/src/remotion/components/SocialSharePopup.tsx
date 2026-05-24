import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface SocialSharePopupProps extends UniversalProps {
  title?: string;
}

export const SocialSharePopup: React.FC<SocialSharePopupProps> = ({
  title = 'Share to friends',
  bgColor = '#ffffff',
  textColor = '#0f172a',
  color = '#3b82f6', // eslint-disable-line @typescript-eslint/no-unused-vars
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Drawer slide up
  const slideUp = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const translateY = interpolate(slideUp, [0, 1], [400, 0]);

  const socialApps = [
    { name: 'Copy Link', bg: '#e2e8f0' },
    { name: 'WhatsApp', bg: '#25D366' },
    { name: 'Twitter', bg: '#1DA1F2' },
    { name: 'Email', bg: '#ef4444' }
  ];

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) translateY(${translateY}px)`, opacity: slideUp, width: '600px', backgroundColor: bgColor, borderRadius: '24px', padding: '30px', boxShadow: '0 40px 100px rgba(0,0,0,0.3)', fontFamily: 'Inter, sans-serif', zIndex: 80 }}>
      
      <div style={{ width: '60px', height: '6px', backgroundColor: '#cbd5e1', borderRadius: '3px', margin: '0 auto 20px auto' }} />
      
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: textColor, textAlign: 'center', marginBottom: '40px' }}>
        {title}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {socialApps.map((app, idx) => {
          const appScale = spring({ frame: Math.max(0, adjustedFrame - 15 - (idx * 5)), fps, config: { damping: 12 } });
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', transform: `scale(${appScale})` }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: app.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#ffffff', borderRadius: '4px' }} />
              </div>
              <div style={{ fontSize: '18px', color: '#64748b', fontWeight: 500 }}>{app.name}</div>
            </div>
          );
        })}
      </div>
      
      {/* Cancel button */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#64748b' }}>
        Cancel
      </div>
    </div>
  );
};

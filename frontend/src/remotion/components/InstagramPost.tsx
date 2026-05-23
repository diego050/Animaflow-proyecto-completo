import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface InstagramPostProps extends UniversalProps {
  username?: string;
  likes?: string;
  caption?: string;
}

export const InstagramPost: React.FC<InstagramPostProps> = ({
  username = 'animaflow.app',
  likes = '1,245',
  caption = 'Launching our new feature today! Link in bio. 🔥 #startup #tech',
  bgColor = '#ffffff',
  textColor = '#0f172a',
  color = '#e1306c', // IG primary accent
  x = 540,
  y = 540,
  fontSize = 24,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: '600px', backgroundColor: bgColor, borderRadius: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', zIndex: 50, overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)`, padding: '2px' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: bgColor, borderRadius: '50%', border: '2px solid transparent', backgroundClip: 'padding-box' }} />
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: textColor }}>{username}</div>
        <div style={{ marginLeft: 'auto', fontWeight: 'bold', color: textColor, letterSpacing: '2px' }}>...</div>
      </div>

      {/* Image Placeholder */}
      <div style={{ width: '100%', height: '600px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ opacity: 0.2 }}>[ Image Area ]</div>
      </div>

      {/* Actions */}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '18px', color: textColor, marginBottom: '10px' }}>
          {likes} likes
        </div>
        <div style={{ fontSize: `${fontSize}px`, color: textColor }}>
          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{username}</span>
          {caption}
        </div>
      </div>
    </div>
  );
};

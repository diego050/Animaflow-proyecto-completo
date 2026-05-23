import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface BreakingNewsAlertProps extends UniversalProps {
  headline?: string;
}

export const BreakingNewsAlert: React.FC<BreakingNewsAlertProps> = ({
  headline = 'MAJOR ANNOUNCEMENT',
  bgColor = '#ef4444', // Red
  textColor = '#ffffff',
  x = 540,
  y = 540,
  fontSize = 80,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Violent pop entrance
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 10, stiffness: 300 } });
  
  // Continuous aggressive pulse
  const pulse = Math.sin(adjustedFrame * 0.3) * 0.05;
  const scale = entrance + pulse;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale})`, zIndex: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ backgroundColor: bgColor, padding: '20px 60px', borderRadius: '12px', boxShadow: `0 0 100px ${bgColor}`, border: '4px solid #ffffff' }}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center', lineHeight: 1 }}>
          {headline}
        </div>
      </div>
      {/* Warning stripes below */}
      <div style={{ marginTop: '20px', width: '80%', height: '20px', background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 20px, #ffffff 20px, #ffffff 40px)', opacity: entrance, borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
    </div>
  );
};

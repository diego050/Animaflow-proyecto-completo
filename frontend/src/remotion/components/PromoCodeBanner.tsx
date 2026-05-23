import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface PromoCodeBannerProps extends UniversalProps {
  code?: string;
  discount?: string;
}

export const PromoCodeBanner: React.FC<PromoCodeBannerProps> = ({
  code = 'SUMMER50',
  discount = '50% OFF',
  bgColor = '#eab308', // Yellow
  textColor = '#0f172a',
  color = '#ffffff', // dashed border
  x = 540,
  y = 540,
  fontSize = 60,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Pop entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 12, stiffness: 200 } });
  
  // Wiggle effect to attract attention
  const rotate = Math.sin(adjustedFrame * 0.2) * 5 * Math.max(0, 1 - (adjustedFrame / 60));

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`, display: 'flex', fontFamily: 'Inter, sans-serif', zIndex: 60, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderRadius: '16px', overflow: 'hidden' }}>
      
      {/* Left Side (Discount) */}
      <div style={{ backgroundColor: bgColor, color: textColor, padding: '40px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${fontSize}px`, fontWeight: 900 }}>
        {discount}
      </div>

      {/* Dashed separator */}
      <div style={{ width: '4px', background: `repeating-linear-gradient(to bottom, transparent, transparent 10px, ${color} 10px, ${color} 20px)`, backgroundColor: bgColor }} />

      {/* Right Side (Code) */}
      <div style={{ backgroundColor: bgColor, color: textColor, padding: '40px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '24px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, opacity: 0.7, marginBottom: '10px' }}>Use Code</div>
        <div style={{ border: `4px dashed ${textColor}`, padding: '10px 30px', borderRadius: '8px', fontSize: `${fontSize * 0.8}px`, fontWeight: 'bold', fontFamily: 'monospace' }}>
          {code}
        </div>
      </div>
      
    </div>
  );
};

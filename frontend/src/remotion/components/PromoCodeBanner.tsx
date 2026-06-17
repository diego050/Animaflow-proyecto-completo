import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  fontSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 12, stiffness: 200 } });
  const rotate = Math.sin(adjustedFrame * 0.2) * 5 * Math.max(0, 1 - adjustedFrame / 60);

  // Relativo al lienzo (antes px: fontSize 24-60, padding 40/60).
  const fs = fontSize ?? c.vmin(8);
  const pad = `${c.vmin(5)}px ${c.vmin(7)}px`;
  const dash1 = c.vmin(1.4);
  const dash2 = c.vmin(2.8);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`, display: 'flex', fontFamily: 'Inter, sans-serif', zIndex: 60, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderRadius: `${c.vmin(2.4)}px`, overflow: 'hidden' }}>
      {/* Left Side (Discount) */}
      <div style={{ backgroundColor: bgColor, color: textColor, padding: pad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${fs}px`, fontWeight: 900 }}>
        {discount}
      </div>

      {/* Dashed separator */}
      <div style={{ width: `${c.vmin(0.6)}px`, background: `repeating-linear-gradient(to bottom, transparent, transparent ${dash1}px, ${color} ${dash1}px, ${color} ${dash2}px)`, backgroundColor: bgColor }} />

      {/* Right Side (Code) */}
      <div style={{ backgroundColor: bgColor, color: textColor, padding: pad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: `${c.vmin(3.2)}px`, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, opacity: 0.7, marginBottom: `${c.vmin(1.4)}px` }}>Use Code</div>
        <div style={{ border: `${c.vmin(0.6)}px dashed ${textColor}`, padding: `${c.vmin(1.4)}px ${c.vmin(4)}px`, borderRadius: `${c.vmin(1.4)}px`, fontSize: `${fs * 0.8}px`, fontWeight: 'bold', fontFamily: 'monospace' }}>
          {code}
        </div>
      </div>
    </div>
  );
};

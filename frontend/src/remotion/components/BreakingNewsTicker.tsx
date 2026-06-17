import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface BreakingNewsTickerProps extends UniversalProps {
  text?: string;
  speed?: number;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  barHeight?: number;
}

export const BreakingNewsTicker: React.FC<BreakingNewsTickerProps> = ({
  text = 'LATEST UPDATES: Market hits record highs as tech stocks surge /// LIVE: Global conference begins in Geneva /// BREAKING: New AI model shatters previous benchmarks',
  bgColor = '#ef4444',
  textColor = '#ffffff',
  speed = 10,
  fontSize = 32,
  badgeText = 'BREAKING',
  badgeBg = '#000000',
  badgeColor = '#ffffff',
  barHeight = 70,
  delay = 0,
  disableEntry = false,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Marquee scroll effect
  const scrollX = (adjustedFrame * speed) % 3000;

  // Entrance from bottom (entrada PROPIA). Si hay un entry externo (wrapper),
  // se desactiva para no animar dos entradas a la vez → arranca en su sitio.
  const translateY = disableEntry
    ? 0
    : interpolate(adjustedFrame, [0, 15], [100, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${barHeight}px`, backgroundColor: bgColor, display: 'flex', alignItems: 'center', fontFamily: 'Inter, sans-serif', transform: `translateY(${translateY}%)`, zIndex: 70, overflow: 'hidden' }}>

      {/* Badge (texto configurable; ya no fijo "BREAKING") */}
      {badgeText !== '' && (
        <div style={{ height: '100%', padding: '0 30px', backgroundColor: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${fontSize}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', zIndex: 2, boxShadow: '10px 0 20px rgba(0,0,0,0.5)' }}>
          {badgeText}
        </div>
      )}
      
      {/* Ticker Text */}
      <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: `${width - scrollX}px`, fontSize: `${fontSize}px`, fontWeight: 600, color: textColor, letterSpacing: '1px' }}>
          {text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {text}
        </div>
      </div>
    </div>
  );
};

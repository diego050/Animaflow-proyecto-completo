import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface BreakingNewsTickerProps extends UniversalProps {
  text?: string;
  speed?: number;
}

export const BreakingNewsTicker: React.FC<BreakingNewsTickerProps> = ({
  text = 'LATEST UPDATES: Market hits record highs as tech stocks surge /// LIVE: Global conference begins in Geneva /// BREAKING: New AI model shatters previous benchmarks',
  bgColor = '#ef4444',
  textColor = '#ffffff',
  speed = 10,
  fontSize = 32,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Marquee scroll effect
  const scrollX = (adjustedFrame * speed) % 3000;

  // Entrance from bottom
  const translateY = interpolate(adjustedFrame, [0, 15], [100, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '70px', backgroundColor: bgColor, display: 'flex', alignItems: 'center', fontFamily: 'Inter, sans-serif', transform: `translateY(${translateY}%)`, zIndex: 70, overflow: 'hidden' }}>
      
      {/* "BREAKING" Badge */}
      <div style={{ height: '100%', padding: '0 30px', backgroundColor: '#000000', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${fontSize}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', zIndex: 2, boxShadow: '10px 0 20px rgba(0,0,0,0.5)' }}>
        BREAKING
      </div>
      
      {/* Ticker Text */}
      <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: `${width - scrollX}px`, fontSize: `${fontSize}px`, fontWeight: 600, color: textColor, letterSpacing: '1px' }}>
          {text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {text}
        </div>
      </div>
    </div>
  );
};

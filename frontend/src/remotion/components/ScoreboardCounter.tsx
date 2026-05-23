import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface ScoreboardCounterProps extends UniversalProps {
  valueA?: number;
  valueB?: number;
  labelA?: string;
  labelB?: string;
  colorA?: string;
  colorB?: string;
}

export const ScoreboardCounter: React.FC<ScoreboardCounterProps> = ({
  valueA = 104,
  valueB = 98,
  labelA = 'HOME',
  labelB = 'AWAY',
  colorA = '#ef4444',
  colorB = '#3b82f6',
  bgColor = '#0f172a',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  fontSize = 120,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  // Number counting effect
  const displayA = Math.floor(spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 12, mass: 2 } }) * valueA);
  const displayB = Math.floor(spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 12, mass: 2 } }) * valueB);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, display: 'flex', fontFamily: 'Inter, sans-serif', zIndex: 50, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', borderRadius: '16px', overflow: 'hidden' }}>
      
      {/* Team A */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '250px' }}>
        <div style={{ backgroundColor: colorA, color: '#ffffff', textAlign: 'center', padding: '15px', fontSize: `${fontSize * 0.25}px`, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
          {labelA}
        </div>
        <div style={{ backgroundColor: bgColor, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontSize: `${fontSize}px`, fontWeight: 900, fontFamily: 'monospace' }}>
          {displayA}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '4px', backgroundColor: '#334155', alignSelf: 'stretch' }} />

      {/* Team B */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '250px' }}>
        <div style={{ backgroundColor: colorB, color: '#ffffff', textAlign: 'center', padding: '15px', fontSize: `${fontSize * 0.25}px`, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
          {labelB}
        </div>
        <div style={{ backgroundColor: bgColor, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontSize: `${fontSize}px`, fontWeight: 900, fontFamily: 'monospace' }}>
          {displayB}
        </div>
      </div>

    </div>
  );
};

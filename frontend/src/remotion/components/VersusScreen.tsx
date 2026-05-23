import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface VersusScreenProps extends UniversalProps {
  nameA?: string;
  nameB?: string;
  colorA?: string;
  colorB?: string;
}

export const VersusScreen: React.FC<VersusScreenProps> = ({
  nameA = 'REACT',
  nameB = 'VUE',
  colorA = '#61dafb',
  colorB = '#42b883',
  textColor = '#ffffff',
  fontSize = 120,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Split entrance
  const splitA = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const splitB = spring({ frame: Math.max(0, adjustedFrame - 5), fps, config: { damping: 14 } });
  
  // VS Badge entrance
  const vsScale = spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 12, mass: 1.5 } });

  // Diagonal clip paths
  const clipA = `polygon(0 0, ${interpolate(splitA, [0, 1], [0, 60])}% 0, ${interpolate(splitA, [0, 1], [0, 40])}% 100%, 0 100%)`;
  const clipB = `polygon(${interpolate(splitB, [0, 1], [100, 60])}% 0, 100% 0, 100% 100%, ${interpolate(splitB, [0, 1], [100, 40])}% 100%)`;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', fontFamily: 'Inter, sans-serif', zIndex: 10, overflow: 'hidden' }}>
      
      {/* Side A */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: colorA, clipPath: clipA, display: 'flex', alignItems: 'center', paddingLeft: '15%' }}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, textShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: `translateX(${interpolate(splitA, [0, 1], [-100, 0])}px)` }}>
          {nameA}
        </div>
      </div>

      {/* Side B */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: colorB, clipPath: clipB, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '15%' }}>
        <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, textShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: `translateX(${interpolate(splitB, [0, 1], [100, 0])}px)` }}>
          {nameB}
        </div>
      </div>
      
      {/* Central VS Badge */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${vsScale})`, width: '160px', height: '160px', borderRadius: '50%', backgroundColor: '#1e293b', border: '8px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 3 }}>
        <div style={{ fontSize: '64px', fontWeight: 900, color: '#ffffff', fontStyle: 'italic' }}>VS</div>
      </div>

    </div>
  );
};

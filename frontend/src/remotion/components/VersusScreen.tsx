import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  fontSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const splitA = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const splitB = spring({ frame: Math.max(0, adjustedFrame - 5), fps, config: { damping: 14 } });
  const vsScale = spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 12, mass: 1.5 } });

  const clipA = `polygon(0 0, ${interpolate(splitA, [0, 1], [0, 60])}% 0, ${interpolate(splitA, [0, 1], [0, 40])}% 100%, 0 100%)`;
  const clipB = `polygon(${interpolate(splitB, [0, 1], [100, 60])}% 0, 100% 0, 100% 100%, ${interpolate(splitB, [0, 1], [100, 40])}% 100%)`;

  // Relativo al lienzo (antes px: fontSize 120, VS badge 160, VS font 64).
  const fs = fontSize ?? c.vmin(15);
  const slide = c.vmin(14);
  const vsBadge = c.vmin(22);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', fontFamily: 'Inter, sans-serif', zIndex: 10, overflow: 'hidden' }}>
      {/* Side A */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: colorA, clipPath: clipA, display: 'flex', alignItems: 'center', paddingLeft: '15%' }}>
        <div style={{ fontSize: `${fs}px`, fontWeight: 900, color: textColor, textShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: `translateX(${interpolate(splitA, [0, 1], [-slide, 0])}px)` }}>
          {nameA}
        </div>
      </div>

      {/* Side B */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: colorB, clipPath: clipB, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '15%' }}>
        <div style={{ fontSize: `${fs}px`, fontWeight: 900, color: textColor, textShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: `translateX(${interpolate(splitB, [0, 1], [slide, 0])}px)` }}>
          {nameB}
        </div>
      </div>

      {/* Central VS Badge */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${vsScale})`, width: vsBadge, height: vsBadge, borderRadius: '50%', backgroundColor: '#1e293b', border: `${c.vmin(1.2)}px solid #ffffff`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 3 }}>
        <div style={{ fontSize: `${c.vmin(9)}px`, fontWeight: 900, color: '#ffffff', fontStyle: 'italic' }}>VS</div>
      </div>
    </div>
  );
};

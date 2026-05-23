import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface HorizontalBarRaceProps extends UniversalProps {
  items?: string; // Comma separated: Name1:100,Name2:80,Name3:50
  colors?: string; // Comma separated hex
  speed?: number;
}

export const HorizontalBarRace: React.FC<HorizontalBarRaceProps> = ({
  items = 'JavaScript:100,Python:90,TypeScript:85,Go:70,Rust:60',
  colors = '#f7df1e,#3776ab,#3178c6,#00add8,#dea584',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const parsedItems = items.split(',').map(item => {
    const [name, val] = item.split(':');
    return { name, val: Number(val) };
  });
  
  const colorArr = colors.split(',');
  const maxVal = Math.max(...parsedItems.map(i => i.val));
  const maxWidth = 700;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, width: '800px', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {parsedItems.map((item, idx) => {
        // Staggered spring entrance
        const drawSpring = spring({ frame: Math.max(0, adjustedFrame - (idx * 5)), fps, config: { damping: 14 } });
        const width = (item.val / maxVal) * maxWidth * drawSpring;
        
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '150px', textAlign: 'right', fontSize: '24px', fontWeight: 'bold', color: textColor }}>
              {item.name}
            </div>
            <div style={{ position: 'relative', width: `${maxWidth}px`, height: '40px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0 20px 20px 0', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${width}px`, backgroundColor: colorArr[idx] || '#3b82f6', borderRadius: '0 20px 20px 0', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }} />
            </div>
            <div style={{ width: '80px', fontSize: '24px', fontWeight: 900, color: colorArr[idx] || '#3b82f6', opacity: drawSpring }}>
              {Math.round(item.val * drawSpring)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

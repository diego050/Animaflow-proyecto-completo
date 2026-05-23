import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface LowerThirdProps extends UniversalProps {
  name?: string;
  title?: string;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name = 'JANE DOE',
  title = 'Chief Technology Officer',
  color = '#2563eb', // Accent bar color
  bgColor = '#ffffff',
  textColor = '#0f172a',
  x = 200,
  y = 800,
  fontSize = 48,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance animations
  const bgWidth = interpolate(adjustedFrame, [0, 15], [0, 800], { extrapolateRight: 'clamp' });
  const barHeight = interpolate(adjustedFrame, [10, 20], [0, 120], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  
  const textOpacity = interpolate(adjustedFrame, [20, 30], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const textTranslateX = interpolate(adjustedFrame, [20, 30], [-20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, height: '120px', display: 'flex', fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      {/* Accent Vertical Bar */}
      <div style={{ width: '12px', height: `${barHeight}px`, backgroundColor: color, alignSelf: 'flex-end', zIndex: 2 }} />
      
      {/* Main Content Area */}
      <div style={{ position: 'relative', width: `${bgWidth}px`, height: '120px', backgroundColor: bgColor, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '30px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', boxShadow: '20px 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ opacity: textOpacity, transform: `translateX(${textTranslateX}px)`, whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.1 }}>
            {name}
          </div>
          <div style={{ fontSize: `${fontSize * 0.5}px`, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};

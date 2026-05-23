import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface FunnelChartProps extends UniversalProps {
  values?: string; // Comma separated ints
  colors?: string; // Comma separated hex
  labels?: string; // Comma separated strings
}

export const FunnelChart: React.FC<FunnelChartProps> = ({
  values = '10000,5000,2000,500',
  colors = '#3b82f6,#8b5cf6,#ec4899,#ef4444',
  labels = 'Visits,Signups,Trials,Customers',
  bgColor = 'transparent',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const valArr = values.split(',').map(Number);
  const colorArr = colors.split(',');
  const labelArr = labels.split(',');
  
  const maxVal = Math.max(...valArr);
  const layerHeight = 100;
  const maxWidth = 600;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {valArr.map((val, idx) => {
        const width = (val / maxVal) * maxWidth;
        
        // Entrance scale and bounce
        const anim = spring({ frame: Math.max(0, adjustedFrame - (idx * 10)), fps, config: { damping: 12 } });
        
        return (
          <div key={idx} style={{ position: 'relative', width: `${width * anim}px`, height: `${layerHeight}px`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* Trapezoid look using SVG */}
            <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, zIndex: -1 }}>
              <polygon points={`0,0 100%,0 ${95 - (idx*5)}%,100% ${5 + (idx*5)}%,100%`} fill={colorArr[idx]} />
            </svg>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: anim }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{val.toLocaleString()}</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>{labelArr[idx]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

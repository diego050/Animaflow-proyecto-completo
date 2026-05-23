import React from 'react';
import { useCurrentFrame } from 'remotion';
import { UniversalProps } from './types';

interface WaveformVisualizerProps extends UniversalProps {
  lineWidth?: number;
  amplitude?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  lineWidth = 6,
  amplitude = 100,
  color = '#8b5cf6',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  
  const width = 800;
  const segments = 100;
  
  // Generate SVG path for a continuous sine wave that changes over time
  let pathD = `M 0 ${amplitude}`;
  
  for (let i = 0; i <= segments; i++) {
    const xPos = (i / segments) * width;
    
    // Complex waveform combining multiple frequencies
    const timeOffset = adjustedFrame * 0.1;
    const baseFreq = (i / segments) * Math.PI * 4;
    
    const y1 = Math.sin(baseFreq - timeOffset) * amplitude * 0.5;
    const y2 = Math.sin(baseFreq * 2.5 + timeOffset * 1.5) * amplitude * 0.3;
    const y3 = Math.sin(baseFreq * 0.5 - timeOffset * 0.5) * amplitude * 0.2;
    
    // Envelope to taper ends
    const envelope = Math.sin((i / segments) * Math.PI);
    
    const yPos = amplitude + (y1 + y2 + y3) * envelope;
    
    pathD += ` L ${xPos} ${yPos}`;
  }

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', zIndex: 30, opacity: adjustedFrame > 0 ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      <svg width={width} height={amplitude * 2} viewBox={`0 0 ${width} ${amplitude * 2}`}>
        <path d={pathD} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" />
        {/* Subtle glow */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={lineWidth * 3} opacity="0.3" strokeLinecap="round" strokeLinejoin="round" filter="blur(8px)" />
      </svg>
    </div>
  );
};

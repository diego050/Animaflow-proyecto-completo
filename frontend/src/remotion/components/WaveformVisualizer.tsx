import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";

interface WaveformVisualizerProps extends UniversalProps {
  lineWidth?: number;
  amplitude?: number;
  points?: number;
  glow?: boolean;
  glowBlur?: number;
  /** Dirección del desplazamiento de la onda. 'still' = onda estacionaria. */
  direction?: 'right' | 'left' | 'still';
  /** Velocidad del desplazamiento (multiplicador). */
  speed?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  lineWidth = 6,
  amplitude = 100,
  points = 100,
  glow = true,
  glowBlur = 8,
  direction = 'right',
  speed = 1,
  width = 800,
  color = '#8b5cf6',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const segments = points;

  // Dirección: right viaja a la derecha (original), left a la izquierda, still
  // deja la onda quieta (estacionaria, sin desplazamiento horizontal).
  const dirSign = direction === 'left' ? -1 : direction === 'still' ? 0 : 1;

  // Generate SVG path for a continuous sine wave that changes over time
  let pathD = `M 0 ${amplitude}`;

  for (let i = 0; i <= segments; i++) {
    const xPos = (i / segments) * width;

    // Complex waveform combining multiple frequencies
    const timeOffset = adjustedFrame * 0.1 * speed * dirSign;
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
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', zIndex: 30, opacity: interpolate(adjustedFrame, [0, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
      <svg width={width} height={amplitude * 2} viewBox={`0 0 ${width} ${amplitude * 2}`}>
        <path d={pathD} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" />
        {/* Subtle glow (opcional) */}
        {glow && (
          <path d={pathD} fill="none" stroke={color} strokeWidth={lineWidth * 3} opacity="0.3" strokeLinecap="round" strokeLinejoin="round" filter={`blur(${glowBlur}px)`} />
        )}
      </svg>
    </div>
  );
};

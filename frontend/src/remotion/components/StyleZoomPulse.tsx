import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

interface StyleZoomPulseProps extends UniversalProps {
  url?: string;
  minScale?: number;
  maxScale?: number;
  speed?: number;
  overlay?: number;
  overlayColor?: string;
  color1?: string;
  color2?: string;
}

/**
 * StyleZoomPulse — Image that pulses (zooms in/out rhythmically) in a continuous loop.
 *
 * DIFFERENT from KenBurns (slow one-way zoom/pan). This loops forever.
 * Deterministic: all animation derived from useCurrentFrame() via sine wave.
 */
export const StyleZoomPulse: React.FC<StyleZoomPulseProps> = ({
  url = '',
  minScale = 1.0,
  maxScale = 1.1,
  speed = 60,
  overlay = 0,
  overlayColor = '#000000',
  color1 = '#0f172a',
  color2 = '#1e293b',
  x = 0,
  y = 0,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Pulse math: deterministic sine loop ---
  const t = (adjustedFrame % speed) / speed; // 0→1, looping
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 - Math.PI / 2); // starts at 0, peaks at 1
  const scale = minScale + (maxScale - minScale) * pulse;

  // --- Sizing via useCanvas ---
  const areaWidth = width ?? c.width;
  const areaHeight = height ?? c.height;

  const background = url
    ? undefined
    : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: areaWidth,
        height: areaHeight,
        overflow: 'hidden',
        borderRadius: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          background,
          willChange: 'transform',
        }}
      >
        {url && (
          <img
            src={url}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </div>

      {overlay > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: overlayColor,
            opacity: Math.min(1, Math.max(0, overlay)),
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

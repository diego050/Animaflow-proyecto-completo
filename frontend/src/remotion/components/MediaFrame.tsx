import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface MediaFrameProps extends UniversalProps {
  url?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  dropShadow?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export const MediaFrame: React.FC<MediaFrameProps> = ({
  url = '',
  borderRadius,
  borderWidth = 0,
  borderColor = '#ffffff',
  dropShadow = true,
  objectFit = 'cover',
  x = 540,
  y = 540,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Relativo al lienzo (antes px: width 600, height 400, fontSize 24).
  const w = width ?? c.vw(72);
  const h = height ?? c.vmin(45);
  const br = borderRadius ?? c.vmin(3);

  // Simple scale entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        borderRadius: `${br}px`,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        boxShadow: dropShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
        overflow: 'hidden',
        backgroundColor: '#f1f5f9', // Placeholder background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fontSize: `${c.vmin(3.4)}px`,
        zIndex: 40,
      }}
    >
      {url ? (
        <img
          src={url}
          alt="Media"
          style={{ width: '100%', height: '100%', objectFit }}
        />
      ) : (
        <div>[Media Placeholder]</div>
      )}
    </div>
  );
};

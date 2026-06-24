import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface MediaFrameProps extends UniversalProps {
  url?: string;
  /** Forma del recorte. 'rounded' usa borderRadius. */
  shape?: 'rect' | 'rounded' | 'circle' | 'triangle';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  dropShadow?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
  /** Cubre TODA la pantalla (ignora x/y/width/height). */
  fullScreen?: boolean;
  /** Color del placeholder cuando no hay imagen. */
  placeholderColor?: string;
}

export const MediaFrame: React.FC<MediaFrameProps> = ({
  url = '',
  shape = 'rounded',
  borderRadius,
  borderWidth = 0,
  borderColor = '#ffffff',
  dropShadow = true,
  objectFit = 'cover',
  fullScreen = false,
  placeholderColor = '#f1f5f9',
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

  // Dimensiones: full screen usa el lienzo completo; si no, libres vía x/y/w/h.
  const w = fullScreen ? c.width : (width ?? c.vw(72));
  const h = fullScreen ? c.height : (height ?? c.vmin(45));
  // Círculo → cuadrado para no deformar; toma la menor dimensión.
  const isCircle = shape === 'circle';
  const boxW = isCircle ? Math.min(w, h) : w;
  const boxH = isCircle ? Math.min(w, h) : h;

  // Radio / recorte según forma.
  let br = `${borderRadius ?? c.vmin(3)}px`;
  let clipPath: string | undefined;
  if (shape === 'rect') br = '0px';
  else if (isCircle) br = '50%';
  else if (shape === 'triangle') { br = '0px'; clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'; }

  // Simple scale entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  // Full screen sin transform de entrada agresivo (evita bordes visibles al escalar).
  const posStyle: React.CSSProperties = fullScreen
    ? { left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: 'center' }
    : { left: `${x}px`, top: `${y}px`, transform: `translate(-50%, -50%) scale(${scale})` };

  return (
    <div
      style={{
        position: 'absolute',
        width: `${boxW}px`,
        height: `${boxH}px`,
        borderRadius: br,
        clipPath,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        boxShadow: dropShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
        overflow: 'hidden',
        backgroundColor: placeholderColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fontSize: `${c.vmin(3.4)}px`,
        zIndex: 40,
        ...posStyle,
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

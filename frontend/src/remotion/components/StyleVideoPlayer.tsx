import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Easing, OffthreadVideo } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface StyleVideoPlayerProps extends UniversalProps {
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  muted?: boolean;
  /** Inicio del fragmento (segundos). */
  trimStart?: number;
  /** Fin del fragmento (segundos, 0 = hasta el final). */
  trimEnd?: number;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  /** Entrada propia. false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

export const StyleVideoPlayer: React.FC<StyleVideoPlayerProps> = ({
  x = 540,
  y = 960,
  src,
  size = 'md',
  muted = true,
  width,
  height,
  trimStart = 0,
  trimEnd = 0,
  borderColor = '#334155',
  borderWidth,
  borderRadius,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const showEntry = animateIn && !disableEntry;
  const scale = showEntry ? interpolate(adjustedFrame, [0, 15], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) }) : 1;
  const opacity = showEntry ? interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

  // Tamaño: presets 16:9 como default; width/height libres lo sobrescriben.
  const widthMap = { sm: c.vw(46), md: c.vw(64), lg: c.vw(82) };
  const w = width && width > 0 ? width : widthMap[size];
  const h = height && height > 0 ? height : w * 0.5625;
  const rad = borderRadius && borderRadius > 0 ? borderRadius : c.vmin(2);
  const bWidth = borderWidth && borderWidth > 0 ? borderWidth : c.vmin(0.4);

  // Recorte por tiempo → frames (Remotion startFrom/endAt).
  const startFrom = Math.max(0, Math.round(trimStart * fps));
  const endAt = trimEnd > 0 ? Math.round(trimEnd * fps) : undefined;

  const containerStyle: React.CSSProperties = {
    position: 'absolute', top: `${y}px`, left: `${x}px`,
    transform: `translate(-50%, -50%) scale(${scale})`, opacity,
    zIndex: 50, width: `${w}px`, height: `${h}px`,
    borderRadius: `${rad}px`, overflow: 'hidden',
  };

  if (!src) {
    return (
      <div style={{ ...containerStyle, backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif', fontSize: c.vmin(3) }}>
        No video source
      </div>
    );
  }

  return (
    <div
      style={{
        ...containerStyle,
        border: bWidth > 0 ? `${bWidth}px solid ${borderColor}` : 'none',
        boxShadow: `0 ${c.vmin(1.5)}px ${c.vmin(5)}px rgba(0,0,0,0.4)`,
      }}
    >
      <OffthreadVideo src={src} startFrom={startFrom} endAt={endAt} muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

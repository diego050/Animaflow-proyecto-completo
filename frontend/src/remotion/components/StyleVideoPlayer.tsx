import React from 'react';
import { interpolate, useCurrentFrame, Easing, Video } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface StyleVideoPlayerProps extends UniversalProps {
  src?: string;
  variant?: 'pip' | 'fullscreen' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  style?: Record<string, unknown>;
}

export const StyleVideoPlayer: React.FC<StyleVideoPlayerProps> = ({
  x = 540,
  y = 960,
  src,
  size = 'md',
  loop = true,
  muted = true,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const scale = interpolate(adjustedFrame, [0, 15], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.2)),
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Relativo al lienzo, manteniendo 16:9 (antes px: 240-480 de ancho).
  const widthMap = { sm: c.vw(46), md: c.vw(64), lg: c.vw(82) };
  const w = widthMap[size];
  const h = w * 0.5625;
  const customWidth = style?.width ? `${style.width}px` : `${w}px`;
  const customHeight = style?.height ? `${style.height}px` : `${h}px`;
  const customBorderRadius = (style?.borderRadius as number) ?? c.vmin(2);
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : `${c.vmin(0.4)}px`;
  const customBorderColor = (style?.borderColor as string) ?? '#334155';
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customBoxShadow = style?.boxShadow ? `${(style.boxShadow as Record<string, unknown>).x || 0}px ${(style.boxShadow as Record<string, unknown>).y || 4}px ${(style.boxShadow as Record<string, unknown>).blur || 16}px ${(style.boxShadow as Record<string, unknown>).spread || 0}px ${(style.boxShadow as Record<string, unknown>).color || 'rgba(0,0,0,0.4)'}` : `0 ${c.vmin(1.5)}px ${c.vmin(5)}px rgba(0,0,0,0.4)`;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

  if (!src) {
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale})`, opacity: customOpacity, zIndex: 50, width: customWidth, height: customHeight, backgroundColor: '#1E293B', borderRadius: `${customBorderRadius}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontFamily: 'Inter, sans-serif', fontSize: c.vmin(3) }}>
        No video source
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: customOpacity,
        zIndex: 50,
        width: customWidth,
        height: customHeight,
        borderRadius: `${customBorderRadius}px`,
        borderWidth: customBorderWidth,
        borderColor: customBorderColor,
        borderStyle: customBorderStyle,
        boxShadow: customBoxShadow,
        overflow: 'hidden',
      }}
    >
      <Video src={src} startFrom={0} endAt={undefined} loop={loop} muted={muted} playbackRate={1} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';

interface StyleWatermarkProps extends UniversalProps {
  src?: string;
  icon?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  size?: number;
  style?: Record<string, unknown>;
}

const positionMap = {
  'top-left': { x: 40, y: 40 },
  'top-right': { x: 1040, y: 40 },
  'bottom-left': { x: 40, y: 1880 },
  'bottom-right': { x: 1040, y: 1880 },
  'center': { x: 540, y: 960 },
};

export const StyleWatermark: React.FC<StyleWatermarkProps> = ({
  x,
  y,
  src,
  icon = 'mdi:watermark',
  position = 'top-right',
  opacity = 0.3,
  size = 60,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const entranceOpacity = interpolate(adjustedFrame, [0, 20], [0, opacity], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const pos = positionMap[position];
  const finalX = x ?? pos.x;
  const finalY = y ?? pos.y;

  const customOpacity = style?.opacity !== undefined ? style.opacity as number : entranceOpacity;
  const customSize = style?.width ? `${style.width}px` : `${size}px`;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${finalY}px`,
        left: `${finalX}px`,
        transform: 'translate(-50%, -50%)',
        opacity: customOpacity,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {src ? (
        <img src={src} alt="Watermark" style={{ width: customSize, height: 'auto', filter: 'grayscale(1) brightness(2)' }} />
      ) : (
        <IconifyIcon name={icon} size={size} color="#FFFFFF" />
      )}
    </div>
  );
};

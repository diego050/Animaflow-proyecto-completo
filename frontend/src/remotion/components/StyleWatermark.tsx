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
  /** Color del ícono. */
  color?: string;
  /** Margen desde el borde para las posiciones de esquina (px). */
  margin?: number;
  /** Forzar imagen en blanco y negro (solo src). */
  monochrome?: boolean;
}

export const StyleWatermark: React.FC<StyleWatermarkProps> = ({
  x,
  y,
  src,
  icon = 'mdi:watermark',
  position = 'top-right',
  opacity = 0.3,
  size = 60,
  color = '#FFFFFF',
  margin = 40,
  monochrome = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const entranceOpacity = interpolate(adjustedFrame, [0, 20], [0, opacity], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });

  // Posicionamiento: si hay x/y → modo manual (centro absoluto). Si no, anclar
  // por BORDES con margen (antes se centraba en la esquina y se salía de pantalla).
  const manual = x !== undefined && y !== undefined;
  const anchor: React.CSSProperties = manual
    ? { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }
    : position === 'center'
    ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    : {
        ...(position.includes('left') ? { left: `${margin}px` } : { right: `${margin}px` }),
        ...(position.includes('top') ? { top: `${margin}px` } : { bottom: `${margin}px` }),
      };

  return (
    <div
      style={{
        position: 'absolute',
        ...anchor,
        opacity: entranceOpacity,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {src ? (
        <img src={src} alt="Watermark" style={{ width: `${size}px`, height: 'auto', filter: monochrome ? 'grayscale(1) brightness(2)' : undefined }} />
      ) : (
        <IconifyIcon inline icon={icon} size={size} color={color} />
      )}
    </div>
  );
};

import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface ProductCardRevealProps extends UniversalProps {
  title?: string;
  price?: string;
  priceColor?: string;
}

export const ProductCardReveal: React.FC<ProductCardRevealProps> = ({
  title = 'Limited Edition Sneakers',
  price = '$199.99',
  x = 540,
  y = 960,
  bgColor = 'rgba(255, 255, 255, 0.95)',
  priceColor = '#10b981',
  textColor = '#0f172a',
  fontSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 12, mass: 0.8, stiffness: 100 } });
  const floatY = Math.sin(adjustedFrame / 15) * c.vmin(1.4);
  // Relativo al lienzo (antes px: width 500, fontSize 24-36, image 300).
  const fs = fontSize ?? c.vmin(5);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, calc(-50% + ${(1 - entrance) * c.vmin(40)}px + ${floatY}px)) scale(${entrance})`,
        width: `${c.vw(72)}px`,
        height: `${c.vmin(60)}px`,
        backgroundColor: bgColor,
        borderRadius: `${c.vmin(4.5)}px`,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: `${c.vmin(5)}px`,
        fontFamily: 'Inter, sans-serif',
        zIndex: 50,
      }}
    >
      <div style={{
        width: `${c.vmin(40)}px`, height: `${c.vmin(40)}px`, backgroundColor: '#f1f5f9',
        borderRadius: `${c.vmin(3)}px`, marginBottom: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#94a3b8', fontSize: `${c.vmin(3.4)}px`, fontWeight: 'bold',
      }}>
        [Product Image]
      </div>
      <h2 style={{ margin: `0 0 ${c.vmin(1.4)}px 0`, fontSize: `${fs}px`, fontWeight: '800', color: textColor, textAlign: 'center', lineHeight: 1.2 }}>
        {title}
      </h2>
      <div style={{
        backgroundColor: priceColor, color: 'white', padding: `${c.vmin(1.4)}px ${c.vmin(3.5)}px`,
        borderRadius: '999px', fontSize: `${fs + c.vmin(1)}px`, fontWeight: '900', marginTop: `${c.vmin(2)}px`,
      }}>
        {price}
      </div>
    </div>
  );
};

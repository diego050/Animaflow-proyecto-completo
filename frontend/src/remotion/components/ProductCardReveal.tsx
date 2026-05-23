import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

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
  fontSize = 36,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 12, mass: 0.8, stiffness: 100 } });
  const floatY = Math.sin(adjustedFrame / 15) * 10;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, calc(-50% + ${(1 - entrance) * 300}px + ${floatY}px)) scale(${entrance})`,
        width: '500px',
        height: '650px',
        backgroundColor: bgColor,
        borderRadius: '30px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '40px',
        fontFamily: 'Inter, sans-serif',
        zIndex: 50,
      }}
    >
      <div style={{
        width: '300px', height: '300px', backgroundColor: '#f1f5f9',
        borderRadius: '20px', marginBottom: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#94a3b8', fontSize: '24px', fontWeight: 'bold',
      }}>
        [Product Image]
      </div>
      <h2 style={{ margin: '0 0 10px 0', fontSize: `${fontSize}px`, fontWeight: '800', color: textColor, textAlign: 'center', lineHeight: '1.2' }}>
        {title}
      </h2>
      <div style={{
        backgroundColor: priceColor, color: 'white', padding: '10px 25px',
        borderRadius: '50px', fontSize: `${fontSize + 6}px`, fontWeight: '900', marginTop: '15px',
      }}>
        {price}
      </div>
    </div>
  );
};

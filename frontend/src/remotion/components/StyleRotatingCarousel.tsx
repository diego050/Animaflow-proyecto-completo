import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// StyleRotatingCarousel — 3D rotating carousel where ALL cards are visible
// simultaneously, rotating in a circular path with depth (z-axis) simulation.
// ---------------------------------------------------------------------------

interface CardData {
  label: string;
  icon?: string;
  color?: string;
}

interface StyleRotatingCarouselProps extends UniversalProps {
  cards?: string[] | CardData[];
  rotationSpeed?: number;
  radius?: number;
  cardWidth?: number;
  cardHeight?: number;
  showTitle?: boolean;
  title?: string;
  cardGradientStart?: string;
  cardGradientEnd?: string;
  cardBorderColor?: string;
  iconGradientStart?: string;
  iconGradientEnd?: string;
}

export const StyleRotatingCarousel: React.FC<StyleRotatingCarouselProps> = ({
  x = 0,
  y = 0,
  cards = ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'],
  rotationSpeed = 0.015,
  radius,
  cardWidth,
  cardHeight,
  showTitle = false,
  title = 'Our Features',
  cardGradientStart = '#1f2937',
  cardGradientEnd = '#374151',
  cardBorderColor = 'rgba(59, 130, 246, 0.3)',
  iconGradientStart = '#3b82f6',
  iconGradientEnd = '#a855f7',
  style: styleOverride,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // --- Layout sizing via useCanvas ---
  const carouselRadius = radius ?? c.vmin(22);
  const cw = cardWidth ?? c.vmin(18);
  const ch = cardHeight ?? c.vmin(22);
  const iconSize = c.vmin(5);
  const cardFont = c.vmin(2.4);
  const titleFont = c.vmin(3);
  const cardBorderRadius = c.vmin(2);
  const iconBorderRadius = c.vmin(1.5);

  // --- Deterministic rotation ---
  const angle = frame * rotationSpeed;

  // Normalize cards to CardData[]
  const normalizedCards: CardData[] = cards.map((item) =>
    typeof item === 'string' ? { label: item } : item
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...((styleOverride as React.CSSProperties) ?? {}),
      }}
    >
      {/* Optional title */}
      {showTitle && (
        <h2
          style={{
            position: 'absolute',
            top: `${c.vh(8)}px`,
            color: 'white',
            fontSize: `${titleFont}px`,
            fontWeight: 'bold',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {title}
        </h2>
      )}

      {/* Carousel container */}
      <div
        style={{
          position: 'relative',
          width: `${carouselRadius * 2.5}px`,
          height: `${ch}px`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {normalizedCards.map((card, i) => {
          const cardAngle = angle + (i * Math.PI * 2) / normalizedCards.length;
          const xPos = Math.sin(cardAngle) * carouselRadius;
          const z = Math.cos(cardAngle);
          const normalizedZ = (z + 1) / 2; // 0 (far) → 1 (near)

          const scale = interpolate(normalizedZ, [0, 1], [0.6, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const opacity = interpolate(normalizedZ, [0, 1], [0.3, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const zIndex = Math.round(normalizedZ * 100);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${xPos}px) scale(${scale})`,
                opacity,
                zIndex,
                width: `${cw}px`,
                height: `${ch}px`,
                borderRadius: `${cardBorderRadius}px`,
                background: `linear-gradient(135deg, ${cardGradientStart}, ${cardGradientEnd})`,
                border: `1px solid ${cardBorderColor}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: `${c.vmin(3)}px`,
                boxSizing: 'border-box',
              }}
            >
              {/* Icon placeholder */}
              <div
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  borderRadius: `${iconBorderRadius}px`,
                  background: `linear-gradient(135deg, ${iconGradientStart}, ${iconGradientEnd})`,
                  marginBottom: `${c.vmin(2)}px`,
                }}
              />
              {/* Label */}
              <span
                style={{
                  color: 'white',
                  fontSize: `${cardFont}px`,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {card.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

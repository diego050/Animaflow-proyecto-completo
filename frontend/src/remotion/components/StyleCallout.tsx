import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleCalloutProps extends UniversalProps {
  text?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  variant?: 'arrow' | 'circle' | 'highlight';
  style?: Record<string, unknown>;
}

export const StyleCallout: React.FC<StyleCalloutProps> = ({
  x = 540,
  y = 400,
  text = '\u00a1Mira aqu\u00ed!',
  direction = 'right',
  variant = 'arrow',
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance: fade + slide
  const slideX = interpolate(adjustedFrame, [0, 15], [direction === 'right' ? -20 : direction === 'left' ? 20 : 0, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const slideY = interpolate(adjustedFrame, [0, 15], [direction === 'bottom' ? -20 : direction === 'top' ? 20 : 0, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const customColor = style?.color ?? '#00FFAB';
  const customFontSize = style?.fontSize ?? 16;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

  if (variant === 'circle') {
    const circleScale = interpolate(adjustedFrame, [0, 10, 15, 20], [0, 1.2, 0.9, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, opacity: customOpacity, zIndex: 60 }}>
        <svg width="80" height="80" style={{ transform: `scale(${circleScale})` }}>
          <circle cx="40" cy="40" r="30" fill="none" stroke={customColor} strokeWidth="2" strokeDasharray="8 4" />
        </svg>
        {text && (
          <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: customFontSize, color: customColor, whiteSpace: 'nowrap' }}>
            {text}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'highlight') {
    const highlightScale = interpolate(adjustedFrame, [0, 15], [0.8, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${highlightScale})`, opacity: customOpacity, zIndex: 60 }}>
        <div style={{ width: 120, height: 80, backgroundColor: `${customColor}20`, border: `2px solid ${customColor}`, borderRadius: 8 }} />
        {text && (
          <div style={{ position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: customFontSize - 2, color: customColor, whiteSpace: 'nowrap' }}>
            {text}
          </div>
        )}
      </div>
    );
  }

  // Arrow variant (default)
  const arrowPath = direction === 'right'
    ? 'M0,10 L30,10 L30,0 L45,15 L30,30 L30,20 L0,20 Z'
    : direction === 'left'
    ? 'M45,10 L15,10 L15,0 L0,15 L15,30 L15,20 L45,20 Z'
    : direction === 'bottom'
    ? 'M10,0 L10,30 L0,30 L15,45 L30,30 L20,30 L20,0 Z'
    : 'M10,45 L10,15 L0,15 L15,0 L30,15 L20,15 L20,45 Z';

  const textOffset = direction === 'right' ? { left: 50, top: -5 } : direction === 'left' ? { right: 50, top: -5 } : direction === 'bottom' ? { top: 50, left: -20 } : { bottom: 50, left: -20 };

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) translate(${slideX}px, ${slideY}px)`, opacity: customOpacity, zIndex: 60, display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="45" height="30" viewBox="0 0 45 30">
        <path d={arrowPath} fill={customColor} />
      </svg>
      {text && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: customFontSize, color: customColor, whiteSpace: 'nowrap', ...textOffset }}>
          {text}
        </div>
      )}
    </div>
  );
};

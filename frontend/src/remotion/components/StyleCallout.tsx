import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface StyleCalloutProps extends UniversalProps {
  text?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  variant?: 'arrow' | 'circle' | 'highlight';
  /** Color del texto (vacío = color de acento). */
  textColor?: string;
  /** Relleno del recuadro (variant highlight; vacío = acento translúcido). */
  bgColor?: string;
  /** Multiplicador de tamaño de la forma. */
  size?: number;
  /** Ancho máximo del texto (px). >0 permite salto de línea. */
  width?: number;
  /** Entrada propia. false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

export const StyleCallout: React.FC<StyleCalloutProps> = ({
  x = 540,
  y = 400,
  text = '¡Mira aquí!',
  direction = 'right',
  variant = 'arrow',
  color = '#00FFAB',
  textColor,
  bgColor,
  fontSize,
  size = 1,
  width = 0,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const showEntry = animateIn && !disableEntry;

  const slideX = showEntry ? interpolate(adjustedFrame, [0, 15], [direction === 'right' ? -c.vmin(2) : direction === 'left' ? c.vmin(2) : 0, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 0;
  const slideY = showEntry ? interpolate(adjustedFrame, [0, 15], [direction === 'bottom' ? -c.vmin(2) : direction === 'top' ? c.vmin(2) : 0, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 0;
  const opacity = showEntry ? interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

  const accent = color || '#00FFAB';
  const fg = textColor || accent;
  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(3.5);
  const hasMax = width > 0;
  const textStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: `${fs}px`, color: fg,
    whiteSpace: hasMax ? 'normal' : 'nowrap', maxWidth: hasMax ? `${width}px` : undefined,
    wordBreak: 'break-word', textAlign: 'center',
  };

  if (variant === 'circle') {
    const dim = c.vmin(14) * size;
    const circleScale = showEntry ? interpolate(adjustedFrame, [0, 10, 15, 20], [0, 1.2, 0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 1;
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, opacity, zIndex: 60 }}>
        <svg width={dim} height={dim} viewBox="0 0 80 80" style={{ transform: `scale(${circleScale})` }}>
          <circle cx="40" cy="40" r="30" fill="none" stroke={accent} strokeWidth={c.vmin(0.5)} strokeDasharray="8 4" />
        </svg>
        {text && (
          <div style={{ position: 'absolute', top: -fs * 1.4, left: '50%', transform: 'translateX(-50%)', ...textStyle }}>
            {text}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'highlight') {
    const boxW = c.vmin(22) * size;
    const boxH = c.vmin(14) * size;
    const highlightScale = showEntry ? interpolate(adjustedFrame, [0, 15], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 1;
    return (
      <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${highlightScale})`, opacity, zIndex: 60 }}>
        <div style={{ width: boxW, height: boxH, backgroundColor: bgColor || `${accent}20`, border: `${c.vmin(0.5)}px solid ${accent}`, borderRadius: c.vmin(1.4) }} />
        {text && (
          <div style={{ position: 'absolute', bottom: -fs * 1.4, left: '50%', transform: 'translateX(-50%)', ...textStyle }}>
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

  const isVerticalArrow = direction === 'top' || direction === 'bottom';
  const arrowW = (isVerticalArrow ? c.vmin(5.3) : c.vmin(8)) * size;
  const arrowH = (isVerticalArrow ? c.vmin(8) : c.vmin(5.3)) * size;
  const flexDir: React.CSSProperties['flexDirection'] = direction === 'bottom' ? 'column' : direction === 'top' ? 'column-reverse' : direction === 'left' ? 'row-reverse' : 'row';

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) translate(${slideX}px, ${slideY}px)`, opacity, zIndex: 60, display: 'flex', flexDirection: flexDir, alignItems: 'center', gap: `${c.vmin(1)}px` }}>
      <svg width={arrowW} height={arrowH} viewBox={isVerticalArrow ? '0 0 30 45' : '0 0 45 30'}>
        <path d={arrowPath} fill={accent} />
      </svg>
      {text && <div style={textStyle}>{text}</div>}
    </div>
  );
};

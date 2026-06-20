import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';

interface StyleSimulatedHoverProps extends UniversalProps {
  text?: string;
  icon?: string;
  hoverFrame?: number;
  hoverDuration?: number;
  variant?: 'button' | 'card' | 'link';
  iconColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  /** Intensidad del "crecer" al hacer hover (0.05 = 5%). */
  hoverScale?: number;
  /** Cuánto "levanta" en hover (px). */
  hoverLift?: number;
  /** Repite el pulso de hover en bucle (cue de "esto es clickable"). */
  repeat?: boolean;
  /** Entrada propia. false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

export const StyleSimulatedHover: React.FC<StyleSimulatedHoverProps> = ({
  x = 540,
  y = 960,
  text = 'Click Here',
  icon,
  hoverFrame = 60,
  hoverDuration = 30,
  variant = 'button',
  bgColor = '#2C3E50',
  textColor = '#FFFFFF',
  iconColor,
  fontSize,
  borderColor = 'transparent',
  borderWidth = 0,
  borderRadius,
  hoverScale = 0.05,
  hoverLift = 4,
  repeat = false,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Pulso de hover: una vez en hoverFrame, o repetido en bucle si `repeat`.
  const localFrame = repeat
    ? (adjustedFrame - hoverFrame) % (hoverDuration * 2 + 1)
    : adjustedFrame;
  const hoverProgress = interpolate(
    localFrame,
    [hoverFrame, hoverFrame + hoverDuration / 2, hoverFrame + hoverDuration],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
  );

  const hoverScaleVal = 1 + hoverProgress * hoverScale;
  const shadowBlur = 10 + hoverProgress * 20;
  const shadowOpacity = 0.3 + hoverProgress * 0.3;
  const translateY = -hoverProgress * hoverLift;

  const showEntry = animateIn && !disableEntry;
  const entranceScale = showEntry ? interpolate(adjustedFrame, [0, 15], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) }) : 1;
  const entranceOpacity = showEntry ? interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

  const fs = fontSize && fontSize > 0 ? fontSize : (variant === 'button' ? 32 : 28);
  const pad = variant === 'button' ? '14px 28px' : '20px';
  const radius = borderRadius && borderRadius > 0 ? borderRadius : (variant === 'button' ? 10 : 14);
  const ic = iconColor || textColor;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${entranceScale * hoverScaleVal}) translateY(${translateY}px)`,
        opacity: entranceOpacity,
        zIndex: 50,
        backgroundColor: bgColor,
        color: textColor,
        padding: pad,
        borderRadius: `${radius}px`,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        boxShadow: `0 ${8 + translateY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`,
        fontFamily: 'Inter, sans-serif',
        fontWeight: variant === 'button' ? 700 : 500,
        fontSize: `${fs}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: 'default',
      }}
    >
      {icon && <IconifyIcon icon={icon} size={fs} color={ic} inline />}
      {text}
    </div>
  );
};

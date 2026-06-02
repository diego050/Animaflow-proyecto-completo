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
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const hoverProgress = interpolate(
    adjustedFrame,
    [hoverFrame, hoverFrame + hoverDuration / 2, hoverFrame + hoverDuration],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) }
  );

  const scale = 1 + hoverProgress * 0.05;
  const shadowBlur = 10 + hoverProgress * 20;
  const shadowOpacity = 0.3 + hoverProgress * 0.3;
  const translateY = -hoverProgress * 4;

  const entranceScale = interpolate(adjustedFrame, [0, 15], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.2)),
  });

  const entranceOpacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const customBg = (style?.backgroundColor as string) ?? '#2C3E50';
  const customColor = (style?.color as string) ?? '#FFFFFF';
  const customPadding = style?.padding ? `${style.padding}px` : (variant === 'button' ? '12px 24px' : '16px');
  const customBorderRadius = (style?.borderRadius as number) ?? (variant === 'button' ? 8 : 12);
  const customFontSize = (style?.fontSize as number) ?? (variant === 'button' ? 16 : variant === 'card' ? 14 : 14);
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : '0px';
  const customBorderColor = (style?.borderColor as string) ?? 'transparent';
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${entranceScale * scale}) translateY(${translateY}px)`,
        opacity: entranceOpacity,
        zIndex: 50,
        backgroundColor: customBg,
        color: customColor,
        padding: customPadding,
        borderRadius: `${customBorderRadius}px`,
        borderWidth: customBorderWidth,
        borderColor: customBorderColor,
        borderStyle: customBorderStyle,
        boxShadow: `0 ${8 + translateY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity})`,
        fontFamily: 'Inter, sans-serif',
        fontWeight: variant === 'button' ? 700 : 500,
        fontSize: `${customFontSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'box-shadow 0.1s ease',
        cursor: 'default',
      }}
    >
      {icon && <IconifyIcon icon={icon} size={customFontSize} color={customColor} />}
      {text}
    </div>
  );
};

import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleDividerProps extends UniversalProps {
  orientation?: 'horizontal' | 'vertical';
  color?: string;
  thickness?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'gradient';
  width?: number;
  height?: number;
  /** Entrada propia (crece desde el centro). false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

export const StyleDivider: React.FC<StyleDividerProps> = ({
  x = 540,
  y = 960,
  orientation = 'horizontal',
  color = '#334155',
  thickness = 2,
  lineStyle = 'solid',
  width = 600,
  height = 300,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const isHorizontal = orientation === 'horizontal';
  const showEntry = animateIn && !disableEntry;
  const scale = showEntry ? interpolate(adjustedFrame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 1;
  const opacity = showEntry ? interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

  // dotted = puntos redondos (gap mayor); dashed = guiones.
  const dashArray = lineStyle === 'dashed' ? `${thickness * 3} ${thickness * 2}` : lineStyle === 'dotted' ? `0.1 ${thickness * 2.5}` : undefined;

  const lengthW = isHorizontal ? `${width}px` : `${thickness}px`;
  const lengthH = isHorizontal ? `${thickness}px` : `${height}px`;

  const lineEl = lineStyle === 'gradient' ? (
    <div style={{ width: isHorizontal ? '100%' : `${thickness}px`, height: isHorizontal ? `${thickness}px` : '100%', background: `linear-gradient(${isHorizontal ? '90deg' : '180deg'}, transparent, ${color}, transparent)`, borderRadius: 999 }} />
  ) : (
    <svg width={isHorizontal ? '100%' : thickness} height={isHorizontal ? thickness : '100%'}>
      <line
        x1={isHorizontal ? '0' : thickness / 2}
        y1={isHorizontal ? thickness / 2 : '0'}
        x2={isHorizontal ? '100%' : thickness / 2}
        y2={isHorizontal ? thickness / 2 : '100%'}
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) ${isHorizontal ? `scaleX(${scale})` : `scaleY(${scale})`}`,
        opacity,
        zIndex: 50,
        width: lengthW,
        height: lengthH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {lineEl}
    </div>
  );
};

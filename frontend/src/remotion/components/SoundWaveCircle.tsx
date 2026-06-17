import React from 'react';
import type { UniversalProps } from "./types";
import { RippleEffect } from './RippleEffect';

/**
 * SoundWaveCircle — DEPRECADO/FUSIONADO (v8, Fase 4).
 *
 * Era prácticamente idéntico a RippleEffect (anillos que crecen desde el centro).
 * Ahora es un wrapper fino sobre RippleEffect en modo `centerDot`, conservando su
 * API (`rings`/`baseSize`/`centerDotSize`) por compatibilidad. Para escenas nuevas
 * usa RippleEffect directamente con `centerDot`.
 */
interface SoundWaveCircleProps extends UniversalProps {
  rings?: number;
  speed?: number;
  strokeWidth?: number;
  centerDotSize?: number;
  baseSize?: number;
}

export const SoundWaveCircle: React.FC<SoundWaveCircleProps> = ({
  rings = 4,
  speed = 1,
  strokeWidth = 4,
  centerDotSize = 40,
  baseSize = 200,
  color = '#f43f5e',
  x = 540,
  y = 540,
  delay = 0,
}) => (
  <RippleEffect
    count={rings}
    maxRadius={baseSize * 1.5}
    speed={speed}
    strokeWidth={strokeWidth}
    color={color}
    centerDot
    centerDotSize={centerDotSize}
    x={x}
    y={y}
    delay={delay}
  />
);

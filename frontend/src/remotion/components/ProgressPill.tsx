import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface ProgressPillProps extends UniversalProps {
  startPercent?: number;
  endPercent?: number;
  barColor?: string;
  /** Segundo color (degradado, solo variant 'gradient'). */
  barColor2?: string;
  trackColor?: string;
  duration?: number;
  showLabel?: boolean;
  /** Posición del % respecto a la barra. */
  labelPosition?: 'top' | 'bottom' | 'inside' | 'left' | 'right';
  /** Estilo de la barra. */
  variant?: 'solid' | 'gradient' | 'striped' | 'segmented' | 'circular';
  /** Nº de segmentos (solo variant 'segmented'). */
  segments?: number;
  /** Diámetro del anillo (solo variant 'circular'). */
  size?: number;
  /** Grosor del anillo (solo variant 'circular'). */
  strokeWidth?: number;
}

export const ProgressPill: React.FC<ProgressPillProps> = ({
  startPercent = 0,
  endPercent = 100,
  barColor = '#3b82f6',
  barColor2 = '#8b5cf6',
  trackColor = '#e2e8f0',
  duration = 60,
  showLabel = true,
  labelPosition = 'bottom',
  variant = 'solid',
  segments = 10,
  size = 200,
  strokeWidth = 16,
  textColor = '#0f172a',
  x = 540,
  y = 540,
  width = 600,
  height = 40,
  fontSize = 24,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  const currentPercent = interpolate(
    adjustedFrame,
    [15, 15 + duration],
    [startPercent, endPercent],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Relleno según variante.
  let fillBackground: string = barColor;
  if (variant === 'gradient') fillBackground = `linear-gradient(90deg, ${barColor}, ${barColor2})`;
  else if (variant === 'striped') fillBackground = `repeating-linear-gradient(45deg, ${barColor} 0px, ${barColor} 14px, ${barColor}cc 14px, ${barColor}cc 28px)`;
  const stripeOffset = variant === 'striped' ? (adjustedFrame * 1.2) % 40 : 0; // marcha de las franjas

  const labelEl = showLabel ? (
    <div style={{ color: textColor, fontSize: `${fontSize}px`, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>
      {Math.round(currentPercent)}%
    </div>
  ) : null;

  // ── Variante circular (anillo) — absorbe el antiguo StyleProgressBar circular.
  if (variant === 'circular') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - currentPercent / 100);
    return (
      <div style={{ position: 'absolute', left: `${x}px`, top: `${y}px`, transform: `translate(-50%, -50%) scale(${entrance})`, zIndex: 55, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        {showLabel && labelPosition === 'top' && labelEl}
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={barColor} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" />
          </svg>
          {labelPosition === 'inside' && showLabel && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textColor, fontSize: `${fontSize}px`, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>
              {Math.round(currentPercent)}%
            </div>
          )}
        </div>
        {showLabel && labelPosition !== 'top' && labelPosition !== 'inside' && labelEl}
      </div>
    );
  }

  // Barra (track + relleno) — segmented se dibuja distinto.
  const bar = variant === 'segmented' ? (
    <div style={{ width: '100%', height: `${height}px`, display: 'flex', gap: `${Math.max(2, height * 0.12)}px` }}>
      {Array.from({ length: Math.max(1, segments) }).map((_, i) => {
        const segThreshold = ((i + 1) / Math.max(1, segments)) * 100;
        const on = currentPercent >= segThreshold - (100 / Math.max(1, segments)) * 0.5;
        return (
          <div key={i} style={{ flex: 1, height: '100%', borderRadius: `${height / 4}px`, backgroundColor: on ? barColor : trackColor, transition: 'background-color 0.1s' }} />
        );
      })}
    </div>
  ) : (
    <div style={{ position: 'relative', width: '100%', height: `${height}px`, backgroundColor: trackColor, borderRadius: `${height / 2}px`, overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ height: '100%', width: `${currentPercent}%`, background: fillBackground, backgroundSize: variant === 'striped' ? '40px 40px' : undefined, backgroundPosition: variant === 'striped' ? `${stripeOffset}px 0` : undefined, borderRadius: `${height / 2}px`, transition: 'width 0.1s ease-out' }} />
      {labelPosition === 'inside' && showLabel && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textColor, fontSize: `${Math.min(fontSize, height * 0.6)}px`, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>
          {Math.round(currentPercent)}%
        </div>
      )}
    </div>
  );

  // Disposición según labelPosition.
  const isRow = labelPosition === 'left' || labelPosition === 'right';
  const showOuterLabel = showLabel && labelPosition !== 'inside';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        alignItems: 'center',
        gap: '10px',
        zIndex: 55,
      }}
    >
      {showOuterLabel && (labelPosition === 'top' || labelPosition === 'left') && labelEl}
      <div style={{ flex: isRow ? 1 : undefined, width: isRow ? undefined : '100%' }}>{bar}</div>
      {showOuterLabel && (labelPosition === 'bottom' || labelPosition === 'right') && labelEl}
    </div>
  );
};

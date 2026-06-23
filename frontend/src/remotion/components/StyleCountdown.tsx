import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// StyleCountdown — Cinematic "5-4-3-2-1-GO" countdown with per-number spring
// ---------------------------------------------------------------------------

interface StyleCountdownProps extends UniversalProps {
  labels?: string[];
  framesPerLabel?: number;
  fontSize?: number;
  finalFontSize?: number;
  textColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  bgColor?: string;
  springDamping?: number;
  springStiffness?: number;
  springMass?: number;
  style?: Record<string, unknown>;
}

export const StyleCountdown: React.FC<StyleCountdownProps> = ({
  x = 0,
  y = 0,
  labels = ['5', '4', '3', '2', '1', 'GO'],
  framesPerLabel = 24,
  fontSize,
  finalFontSize,
  textColor = '#ffffff',
  gradientStart = '#3b82f6',
  gradientEnd = '#7209b7',
  bgColor = '#111827',
  springDamping = 12,
  springStiffness = 200,
  springMass = 0.5,
  opacity: opacityProp = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // --- Determine current label index and segment frame ---
  const totalLabels = labels.length;
  const currentIndex = Math.min(Math.floor(frame / framesPerLabel), totalLabels - 1);
  const frameInSegment = frame - currentIndex * framesPerLabel;
  const currentLabel = labels[currentIndex];
  const isFinal = currentIndex === totalLabels - 1;

  // --- Spring scale per label ---
  const scale = spring({
    frame: frameInSegment,
    fps,
    config: { damping: springDamping, stiffness: springStiffness, mass: springMass },
  });

  // --- Opacity: fade in → stay → fade out (final label stays visible) ---
  const opacity = interpolate(
    frameInSegment,
    [0, 5, framesPerLabel - 8, framesPerLabel],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );
  const effectiveOpacity = isFinal ? 1 : opacity;

  // --- Layout sizing via useCanvas ---
  const labelFontSize = fontSize ?? c.vmin(14);
  const finalLabelFontSize = finalFontSize ?? c.vmin(12);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        opacity: opacityProp,
        ...style,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: effectiveOpacity,
          fontSize: `${isFinal ? finalLabelFontSize : labelFontSize}px`,
          fontWeight: 900,
          fontFamily: 'Inter Tight, sans-serif',
          color: isFinal ? undefined : textColor,
          background: isFinal
            ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
            : undefined,
          WebkitBackgroundClip: isFinal ? 'text' : undefined,
          WebkitTextFillColor: isFinal ? 'transparent' : undefined,
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {currentLabel}
      </div>
    </div>
  );
};

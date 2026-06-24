import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

type PanDirection = 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top';

interface StyleParallaxPanProps extends UniversalProps {
  url?: string;
  direction?: PanDirection;
  scale?: number;
  duration?: number;
  overlay?: number;
  overlayColor?: string;
  color1?: string;
  color2?: string;
}

/**
 * StyleParallaxPan — Image that pans slowly in a configurable direction
 * with scale > 1 to avoid edge exposure (continuous slow pan / cinematic pan).
 *
 * DIFFERENT from KenBurns (one-way zoom+pan) and StyleZoomPulse (rhythmic in/out).
 * This loops continuously in one direction.
 * Deterministic: ALL animation via interpolate() from useCurrentFrame().
 */
export const StyleParallaxPan: React.FC<StyleParallaxPanProps> = ({
  url = '',
  direction = 'left-right',
  scale = 1.2,
  duration = 150,
  overlay = 0,
  overlayColor = '#000000',
  color1 = '#0f172a',
  color2 = '#1e293b',
  x = 540,
  y = 960,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Pan math: deterministic loop via interpolate ---
  const p = interpolate(adjustedFrame % duration, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });

  const panAmount = (scale - 1) * 100; // % we can move
  let translateX = 0;
  let translateY = 0;

  if (direction === 'left-right') translateX = interpolate(p, [0, 1], [0, -panAmount]);
  else if (direction === 'right-left') translateX = interpolate(p, [0, 1], [-panAmount, 0]);
  else if (direction === 'top-bottom') translateY = interpolate(p, [0, 1], [0, -panAmount]);
  else translateY = interpolate(p, [0, 1], [-panAmount, 0]);

  // --- Full-bleed by default; honor an explicit smaller size as a region ---
  const areaWidth = width ?? c.width;
  const areaHeight = height ?? c.height;
  const isRegion = areaWidth < c.width - 1 || areaHeight < c.height - 1;

  const background = url
    ? undefined
    : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;

  return (
    <div
      style={{
        position: 'absolute',
        top: isRegion ? `${y}px` : 0,
        left: isRegion ? `${x}px` : 0,
        transform: isRegion ? 'translate(-50%, -50%)' : undefined,
        width: areaWidth,
        height: areaHeight,
        overflow: 'hidden',
      }}
    >
      {/* Image / gradient layer with pan transform */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          transformOrigin: 'center center',
          background,
          willChange: 'transform',
        }}
      >
        {url && (
          <img
            src={url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>

      {/* Optional dark overlay for text legibility */}
      {overlay > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: overlayColor,
            opacity: Math.min(1, Math.max(0, overlay)),
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

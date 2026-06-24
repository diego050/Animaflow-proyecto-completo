import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import type { UniversalProps } from "./types";

type KenBurnsDirection =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down';

interface KenBurnsProps extends UniversalProps {
  url?: string;
  direction?: KenBurnsDirection;
  intensity?: number; // 0.05 - 0.4 : how much extra zoom range
  color1?: string; // gradient fallback when no url
  color2?: string;
  overlay?: number; // 0 - 1 : dark overlay for text legibility
  overlayColor?: string;
}

/**
 * Cinematic full-bleed Ken Burns effect (slow zoom + pan).
 *
 * - Background role: fills the whole canvas, no absolute px (responsive by design).
 * - Deterministic: animation derived purely from `frame` over the scene duration.
 * - If `url` is empty it falls back to an animated gradient so the effect still
 *   reads as a moving "photo plate" for visual-only scenes.
 */
export const KenBurns: React.FC<KenBurnsProps> = ({
  url = '',
  direction = 'zoom-in',
  intensity = 0.15,
  color1 = '#0f172a',
  color2 = '#1e293b',
  overlay = 0,
  overlayColor = '#000000',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Normalized 0 -> 1 progress across the scene, eased for a smooth glide.
  const p = interpolate(adjustedFrame, [0, Math.max(1, durationInFrames - delay)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });

  // Clamp intensity to a tasteful range so the motion never feels jarring.
  const amt = Math.min(0.4, Math.max(0.05, intensity));

  // Base over-scale so panning never reveals edges.
  const baseScale = 1 + amt;

  let scale = baseScale;
  let translateX = 0; // in % of the element
  let translateY = 0;

  // Pan amount expressed as a fraction of the available slack (over-scale).
  const slack = (amt * 100) / 2; // % we can move without showing edges

  switch (direction) {
    case 'zoom-in':
      scale = interpolate(p, [0, 1], [1, baseScale]);
      break;
    case 'zoom-out':
      scale = interpolate(p, [0, 1], [baseScale, 1]);
      break;
    case 'pan-left':
      translateX = interpolate(p, [0, 1], [slack, -slack]);
      break;
    case 'pan-right':
      translateX = interpolate(p, [0, 1], [-slack, slack]);
      break;
    case 'pan-up':
      translateY = interpolate(p, [0, 1], [slack, -slack]);
      break;
    case 'pan-down':
      translateY = interpolate(p, [0, 1], [-slack, slack]);
      break;
  }

  const background = url
    ? undefined
    : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
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
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </div>

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
          }}
        />
      )}
    </div>
  );
};

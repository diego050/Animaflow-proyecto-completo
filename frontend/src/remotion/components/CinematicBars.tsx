import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface CinematicBarsProps extends UniversalProps {
  size?: number; // bar height as % of canvas height (per bar)
  color?: string;
  animate?: boolean; // slide bars in
  duration?: number; // frames for the slide-in
}

/**
 * Letterbox / cinematic black bars (top + bottom) for a 2.39:1 "film" look.
 *
 * - Overlay role: full-bleed, no absolute px, sits above content (zIndex 9990,
 *   below GlobalVFX/transition overlays).
 * - Deterministic slide-in derived purely from `frame`.
 */
export const CinematicBars: React.FC<CinematicBarsProps> = ({
  size = 11,
  color = '#000000',
  animate = true,
  duration = 18,
  delay = 0,
  disableEntry = false,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const barHeight = Math.min(50, Math.max(0, size));

  // Slide-in PROPIO. Si la capa define un entry/exit (wrapper), `disableEntry`
  // lo apaga para que el fade-in/out del wrapper controle la entrada y salida.
  const progress = (animate && !disableEntry)
    ? interpolate(adjustedFrame, [0, Math.max(1, duration)], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 1;

  const shownHeight = barHeight * progress;

  const barStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: `${shownHeight}%`,
    backgroundColor: color,
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9990,
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...barStyle, top: 0 }} />
      <div style={{ ...barStyle, bottom: 0 }} />
    </div>
  );
};

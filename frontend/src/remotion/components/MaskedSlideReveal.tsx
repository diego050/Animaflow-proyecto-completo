/**
 * MaskedSlideReveal — Words slide up from behind a clipping mask, one by one.
 *
 * Each word sits inside an overflow-hidden wrapper; the inner span springs from
 * translateY(100%) (fully hidden below the mask) to 0. Staggered per word.
 *
 * Differs from MaskedReveal (which clips the whole block with a directional
 * clip-path) — here every word has its own mask and slides independently.
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface MaskedSlideRevealProps extends UniversalProps {
  text?: string;
  textColor?: string;
  fontWeight?: number;
  /** Frames between each word's reveal. */
  staggerDelay?: number;
  springDamping?: number;
  /** Speed multiplier (>=1 = faster). */
  speed?: number;
  textAlign?: 'left' | 'center' | 'right';
  style?: Record<string, unknown>;
}

export const MaskedSlideReveal: React.FC<MaskedSlideRevealProps> = ({
  x = 0,
  y = 0,
  text = 'Reveal from the mask',
  textColor = '#ffffff',
  fontWeight = 700,
  staggerDelay = 3,
  springDamping = 18,
  speed = 1,
  textAlign = 'center',
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const fs = fontSize ?? c.vmin(7);
  const words = text.split(' ');
  const spd = Math.max(0.1, speed);
  const justify =
    textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: '90%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: justify,
        alignItems: 'flex-end',
        gap: `${fs * 0.28}px`,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const local = (frame - (i * staggerDelay) / spd) * spd;
        const p = spring({ frame: local, fps, config: { damping: springDamping } });
        const ty = (1 - p) * 100; // percent of own height, hidden below
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              lineHeight: 1.1,
              paddingBottom: '0.08em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${ty}%)`,
                color: textColor,
                fontSize: `${fs}px`,
                fontWeight,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
};

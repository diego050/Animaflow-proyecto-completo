/**
 * SlotMachineRoll — Numbers roll into place like a slot machine reel.
 *
 * Each digit of `to` is a vertical reel (0–9 repeated) that spins down and lands
 * on its target value with a spring settle. Non-digit characters ($, commas,
 * etc.) render static. One-time animation.
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface SlotMachineRollProps extends UniversalProps {
  /** Starting value (shown rolling away). */
  from?: string;
  /** Final value the reels land on. */
  to?: string;
  textColor?: string;
  fontWeight?: number;
  /** Extra full 0–9 rotations before landing (slot feel). */
  spins?: number;
  springDamping?: number;
  /** Frames between each digit's settle (left→right cascade). */
  staggerDelay?: number;
  /** Speed multiplier (>=1 = faster). */
  speed?: number;
  style?: Record<string, unknown>;
}

export const SlotMachineRoll: React.FC<SlotMachineRollProps> = ({
  x = 0,
  y = 0,
  from = '$99',
  to = '$199',
  textColor = '#ffffff',
  fontWeight = 700,
  spins = 2,
  springDamping = 16,
  staggerDelay = 4,
  speed = 1,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const fs = fontSize ?? c.vmin(11);
  const lineH = fs * 1.1;
  const spd = Math.max(0.1, speed);
  const target = String(to);
  void from; // `from` documents intent; reels always roll to `to`.

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {target.split('').map((ch, i) => {
        const isDigit = ch >= '0' && ch <= '9';
        if (!isDigit) {
          return (
            <span
              key={i}
              style={{
                color: textColor,
                fontSize: `${fs}px`,
                fontWeight,
                lineHeight: `${lineH}px`,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {ch}
            </span>
          );
        }
        const targetDigit = parseInt(ch, 10);
        const steps = spins * 10 + targetDigit; // strip length - 1
        const local = frame - (i * staggerDelay) / spd;
        const p = spring({ frame: local * spd, fps, config: { damping: springDamping } });
        const ty = -p * steps * lineH;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              height: `${lineH}px`,
              fontSize: `${fs}px`,
              fontWeight,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            <span style={{ display: 'block', transform: `translateY(${ty}px)` }}>
              {Array.from({ length: steps + 1 }).map((_, k) => (
                <span
                  key={k}
                  style={{
                    display: 'block',
                    height: `${lineH}px`,
                    lineHeight: `${lineH}px`,
                    color: textColor,
                    textAlign: 'center',
                  }}
                >
                  {k % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * MeshGradientBg — Full-bleed animated mesh gradient (aurora-style soft color
 * blobs that drift and blend behind everything).
 *
 * Four large radial color stops slide on deterministic sine paths over a solid
 * background, heavily blurred so they melt into one continuous mesh.
 *
 * Full-screen background (no x/y contract — covers the whole canvas, zIndex 0).
 * Deterministic (function of frame only).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';

interface MeshGradientBgProps extends UniversalProps {
  background?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  color4?: string;
  /** Blur in px (higher = softer / more blended). */
  blur?: number;
  /** Drift speed multiplier. */
  speed?: number;
  style?: Record<string, unknown>;
}

export const MeshGradientBg: React.FC<MeshGradientBgProps> = ({
  background = '#0a0a0a',
  color1 = '#6d28d9',
  color2 = '#2563eb',
  color3 = '#db2777',
  color4 = '#0891b2',
  blur = 80,
  speed = 1,
  opacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const t = frame * 0.02 * Math.max(0.05, speed);

  // Each stop drifts on its own sine/cosine path (percent of the surface).
  const px = (phase: number, amp: number) => 50 + Math.cos(t + phase) * amp;
  const py = (phase: number, amp: number) => 50 + Math.sin(t * 1.3 + phase) * amp;

  const stops = [
    { c: color1, x: px(0, 30), y: py(0, 28) },
    { c: color2, x: px(2.1, 32), y: py(1.4, 30) },
    { c: color3, x: px(4.2, 28), y: py(3.0, 26) },
    { c: color4, x: px(5.5, 34), y: py(4.7, 24) },
  ];

  const backgroundImage = stops
    .map((s) => `radial-gradient(at ${s.x.toFixed(2)}% ${s.y.toFixed(2)}%, ${s.c} 0px, transparent 50%)`)
    .join(', ');

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: background, zIndex: 0, opacity }}>
      <div
        style={{
          position: 'absolute',
          // Bleed past the edges so the blur never reveals the background corners.
          top: `-${blur * 1.5}px`,
          left: `-${blur * 1.5}px`,
          right: `-${blur * 1.5}px`,
          bottom: `-${blur * 1.5}px`,
          backgroundImage,
          filter: `blur(${blur}px)`,
          ...style,
        }}
      />
    </div>
  );
};

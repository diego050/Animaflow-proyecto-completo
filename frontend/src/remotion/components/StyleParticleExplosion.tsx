/**
 * StyleParticleExplosion — burst of particles that explode outward from center
 * with spring physics, rotation, and fade out. Optional centered text label.
 *
 * Deterministic: all animations driven by useCurrentFrame() + spring().
 * Per-particle variation uses Remotion's random(i) (deterministic seed).
 */
import React from 'react';
import { random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

export interface StyleParticleExplosionProps extends UniversalProps {
  particleCount?: number;
  text?: string;
  textFontSize?: number;
  textColor?: string;
  textShadow?: boolean;
  particleSize?: number;
  maxDistance?: number;
  hueStart?: number;
  hueRange?: number;
  saturation?: number;
  lightness?: number;
  springDamping?: number;
  springMass?: number;
  rotationSpeed?: number;
  fadeDuration?: number;
  style?: Record<string, unknown>;
}

export const StyleParticleExplosion: React.FC<StyleParticleExplosionProps> = ({
  x = 0,
  y = 0,
  particleCount = 150,
  text = '',
  textFontSize,
  textColor = '#ffffff',
  textShadow = true,
  particleSize,
  maxDistance,
  hueStart = 200,
  hueRange = 40,
  saturation = 85,
  lightness = 70,
  springDamping = 12,
  springMass = 0.3,
  rotationSpeed = 0.02,
  fadeDuration = 90,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // --- Responsive sizing via useCanvas ---
  const size = particleSize ?? c.vmin(1.2);
  const dist = maxDistance ?? c.vmin(18);
  const fontSize = textFontSize ?? c.vmin(5);
  const glowBlur = c.vmin(0.5);

  // --- Particle data (deterministic via random(i)) ---
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const baseAngle = (i / particleCount) * Math.PI * 2;
    const rotatingAngle = baseAngle + frame * rotationSpeed;

    const scale = spring({
      frame,
      fps,
      from: 0,
      to: random(i) * 1.2 + 0.3,
      config: { mass: springMass, damping: springDamping },
    });

    const distance = spring({
      frame,
      fps,
      from: 0,
      to: dist + random(i) * 40,
      config: { mass: springMass + 0.1, damping: springDamping - 2 },
    });

    const px = Math.cos(rotatingAngle) * distance;
    const py = Math.sin(rotatingAngle) * distance;
    const opacity = Math.max(0, 1 - frame / fadeDuration);

    return { x: px, y: py, opacity, scale };
  });

  // --- Coordinate contract: x/y offsets from center ---
  const centerX = c.width / 2 + x;
  const centerY = c.height / 2 + y;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${centerX}px`,
        top: `${centerY}px`,
        transform: 'translate(-50%, -50%)',
        width: c.width,
        height: c.height,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Center text (optional) */}
      {text && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${Math.min(1, frame / 10)})`,
            fontSize,
            fontWeight: 800,
            color: textColor,
            textShadow: textShadow
              ? `0 0 ${glowBlur}px rgba(255,255,255,0.5)`
              : undefined,
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </div>
      )}

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
            width: size,
            height: size,
            backgroundColor: `hsl(${hueStart + (i / particleCount) * hueRange}, ${saturation}%, ${lightness}%)`,
            borderRadius: '50%',
            opacity: p.opacity,
            boxShadow: `0 0 ${glowBlur}px rgba(255,255,255,0.3)`,
          }}
        />
      ))}
    </div>
  );
};

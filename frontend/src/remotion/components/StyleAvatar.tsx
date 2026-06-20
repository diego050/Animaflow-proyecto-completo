import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';
import { useCanvas } from '../utils/canvas';

interface StyleAvatarProps extends UniversalProps {
  icon?: string;
  name?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'ring' | 'gradient';
  showBadge?: boolean;
  badgeText?: string;
  /** Color del ícono interior. */
  iconColor?: string;
  /** Color de la rueda/borde (variant solid/ring). */
  ringColor?: string;
  /** Colores del degradado (variant gradient). */
  gradColor1?: string;
  gradColor2?: string;
  gradColor3?: string;
  /** Color de fondo del círculo del avatar. */
  bgColor?: string;
  /** Colores del badge. */
  badgeColor?: string;
  badgeTextColor?: string;
  /** Colores de nombre y subtítulo. */
  nameColor?: string;
  subtitleColor?: string;
  /** Grosor de la rueda/borde (px). */
  ringWidth?: number;
  style?: Record<string, unknown>;
}

const variantDefaults = {
  solid: { ring: '#334155' },
  ring: { ring: '#00FFAB' },
  gradient: { ring: '#FF8C00' },
};

export const StyleAvatar: React.FC<StyleAvatarProps> = ({
  x = 540,
  y = 400,
  icon = 'mdi:account',
  name,
  subtitle,
  size = 'md',
  variant = 'ring',
  showBadge = false,
  badgeText,
  iconColor = '#E2E8F0',
  ringColor,
  gradColor1 = '#00FFAB',
  gradColor2 = '#FF8C00',
  gradColor3 = '#3B82F6',
  bgColor = '#1E293B',
  badgeColor = '#EF4444',
  badgeTextColor = '#FFFFFF',
  nameColor = '#FFFFFF',
  subtitleColor = '#94A3B8',
  ringWidth,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Tamaños relativos al lienzo.
  const sizeMap = {
    sm: { avatarSize: c.vmin(10), iconSize: c.vmin(5), fontSize: c.vmin(3), ringWidth: c.vmin(0.4) },
    md: { avatarSize: c.vmin(14), iconSize: c.vmin(7), fontSize: c.vmin(3.4), ringWidth: c.vmin(0.5) },
    lg: { avatarSize: c.vmin(18), iconSize: c.vmin(9), fontSize: c.vmin(3.8), ringWidth: c.vmin(0.6) },
  };

  const scale = interpolate(adjustedFrame, [0, 10, 15, 20], [0, 1.2, 0.9, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(adjustedFrame, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ringRotation = interpolate(adjustedFrame, [0, 120], [0, 360], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear });
  const glowScale = interpolate(adjustedFrame % 60, [0, 30, 60], [1, 1.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) });
  const badgeScale = showBadge ? interpolate(adjustedFrame, [15, 22, 26, 30], [0, 1.3, 0.85, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 0;

  const s = sizeMap[size];
  const ring = ringColor || variantDefaults[variant].ring;
  const bw = ringWidth && ringWidth > 0 ? ringWidth : s.ringWidth;
  const gradId = `avatarGrad-${x}-${y}`;
  const svgSize = s.avatarSize + bw * 2 + 4;

  return (
    <div
      style={{
        position: 'absolute', top: `${y}px`, left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`, opacity,
        zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${c.vmin(1.2)}px`,
      }}
    >
      {/* Avatar container */}
      <div style={{ position: 'relative', width: s.avatarSize, height: s.avatarSize }}>
        {/* Glow aura */}
        {variant === 'ring' && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) scale(${glowScale})`,
            width: s.avatarSize + c.vmin(2.4), height: s.avatarSize + c.vmin(2.4),
            borderRadius: '50%', backgroundColor: ring, opacity: 0.12, filter: 'blur(12px)',
          }} />
        )}

        {/* Animated ring (SVG) */}
        {variant !== 'solid' && (
          <svg
            width={svgSize} height={svgSize}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${variant === 'ring' ? ringRotation : 0}deg)` }}
          >
            <defs>
              {variant === 'gradient' && (
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={gradColor1} />
                  <stop offset="50%" stopColor={gradColor2} />
                  <stop offset="100%" stopColor={gradColor3} />
                </linearGradient>
              )}
            </defs>
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={s.avatarSize / 2 + bw}
              fill="none"
              stroke={variant === 'gradient' ? `url(#${gradId})` : ring}
              strokeWidth={bw}
              strokeDasharray={variant === 'ring' ? '8 4' : undefined}
            />
          </svg>
        )}

        {/* Avatar circle */}
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: s.avatarSize, height: s.avatarSize, borderRadius: '50%',
            backgroundColor: bgColor, border: `${bw}px solid ${ring}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          {/* inline: se renderiza DENTRO del círculo (antes salía a la esquina y se recortaba) */}
          <IconifyIcon inline icon={icon} size={s.iconSize} color={iconColor} />
        </div>

        {/* Badge */}
        {showBadge && (
          <div
            style={{
              position: 'absolute', top: `${-c.vmin(0.6)}px`, right: `${-c.vmin(0.6)}px`,
              transform: `scale(${badgeScale})`, backgroundColor: badgeColor, color: badgeTextColor,
              fontSize: c.vmin(2), fontWeight: 700, padding: `${c.vmin(0.4)}px ${c.vmin(1.2)}px`,
              borderRadius: 999, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', zIndex: 60,
            }}
          >
            {badgeText || '•'}
          </div>
        )}
      </div>

      {/* Name */}
      {name && (
        <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: s.fontSize, color: nameColor, textAlign: 'center', letterSpacing: '-0.3px' }}>
          {name}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: s.fontSize - c.vmin(0.4), color: subtitleColor, textAlign: 'center' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

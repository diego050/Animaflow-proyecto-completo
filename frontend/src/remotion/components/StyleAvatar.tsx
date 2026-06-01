import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';

interface StyleAvatarProps extends UniversalProps {
  icon?: string;
  name?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'ring' | 'gradient';
  showBadge?: boolean;
  badgeText?: string;
  style?: Record<string, unknown>;
}

const sizeMap = {
  sm: { avatarSize: 48, iconSize: 24, fontSize: 14, ringWidth: 2 },
  md: { avatarSize: 64, iconSize: 32, fontSize: 16, ringWidth: 3 },
  lg: { avatarSize: 80, iconSize: 40, fontSize: 18, ringWidth: 3 },
};

const variantMap = {
  solid: { bg: '#1E293B', border: '#334155' },
  ring: { bg: '#1E293B', border: '#00FFAB' },
  gradient: { bg: '#1E293B', border: '#FF8C00' },
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
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance: scale bounce
  const scale = interpolate(adjustedFrame, [0, 10, 15, 20], [0, 1.2, 0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Ring rotation animation (continuous)
  const ringRotation = interpolate(adjustedFrame, [0, 120], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });

  // Glow pulse
  const glowScale = interpolate(
    adjustedFrame % 60,
    [0, 30, 60],
    [1, 1.15, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) }
  );

  // Badge spring
  const badgeScale = showBadge ? interpolate(adjustedFrame, [15, 22, 26, 30], [0, 1.3, 0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }) : 0;

  const s = sizeMap[size];
  const v = variantMap[variant];

  // Style overrides
  const customBorderWidth = (style?.borderWidth as number) ?? s.ringWidth;
  const customBorderColor = (style?.borderColor as string) ?? v.border;
  const customBg = (style?.backgroundColor as string) ?? v.bg;
  const boxShadow = style?.boxShadow as Record<string, unknown> | undefined;
  const customBoxShadow = boxShadow
    ? `${(boxShadow.x as number) || 0}px ${(boxShadow.y as number) || 4}px ${(boxShadow.blur as number) || 16}px ${(boxShadow.spread as number) || 0}px ${(boxShadow.color as string) || 'rgba(0,0,0,0.3)'}`
    : '0 4px 16px rgba(0,0,0,0.3)';
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: customOpacity,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {/* Avatar container */}
      <div style={{ position: 'relative', width: s.avatarSize, height: s.avatarSize }}>
        {/* Glow aura */}
        {variant === 'ring' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${glowScale})`,
              width: s.avatarSize + 16,
              height: s.avatarSize + 16,
              borderRadius: '50%',
              backgroundColor: customBorderColor,
              opacity: 0.12,
              filter: 'blur(12px)',
            }}
          />
        )}

        {/* Animated ring (SVG) */}
        {variant !== 'solid' && (
          <svg
            width={s.avatarSize + customBorderWidth * 2 + 4}
            height={s.avatarSize + customBorderWidth * 2 + 4}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${variant === 'ring' ? ringRotation : 0}deg)`,
            }}
          >
            <defs>
              {variant === 'gradient' && (
                <linearGradient id={`avatarGrad-${x}-${y}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00FFAB" />
                  <stop offset="50%" stopColor="#FF8C00" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              )}
            </defs>
            <circle
              cx={(s.avatarSize + customBorderWidth * 2 + 4) / 2}
              cy={(s.avatarSize + customBorderWidth * 2 + 4) / 2}
              r={s.avatarSize / 2 + customBorderWidth}
              fill="none"
              stroke={variant === 'gradient' ? `url(#avatarGrad-${x}-${y})` : customBorderColor}
              strokeWidth={customBorderWidth}
              strokeDasharray={variant === 'ring' ? '8 4' : undefined}
            />
          </svg>
        )}

        {/* Avatar circle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: s.avatarSize,
            height: s.avatarSize,
            borderRadius: '50%',
            backgroundColor: customBg,
            border: `${customBorderWidth}px solid ${customBorderColor}`,
            boxShadow: customBoxShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <IconifyIcon name={icon} size={s.iconSize} color="#E2E8F0" />
        </div>

        {/* Badge */}
        {showBadge && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              transform: `scale(${badgeScale})`,
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 999,
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap',
              zIndex: 60,
            }}
          >
            {badgeText || '\u2022'}
          </div>
        )}
      </div>

      {/* Name */}
      {name && (
        <div
          style={{
            fontFamily: 'Inter Tight, sans-serif',
            fontWeight: 700,
            fontSize: s.fontSize,
            color: '#FFFFFF',
            textAlign: 'center',
            letterSpacing: '-0.3px',
          }}
        >
          {name}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: s.fontSize - 2,
            color: '#94A3B8',
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

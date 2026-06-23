import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationItem {
  title: string;
  body: string;
  color?: string;
  delay?: number;
}

interface StyleNotificationStackProps extends UniversalProps {
  notifications?: NotificationItem[];
  showTitle?: boolean;
  title?: string;
  cardWidth?: number;
  slideDistance?: number;
  springDamping?: number;
  springStiffness?: number;
  springMass?: number;
  showBadge?: boolean;
  badgeCount?: number;
  badgeColor?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { title: 'New Message', body: 'Hey! Check out this update.', color: '#3b82f6', delay: 0 },
  { title: 'Task Complete', body: 'Your render finished successfully.', color: '#a855f7', delay: 20 },
  { title: 'New Follower', body: 'Someone started following you.', color: '#4361ee', delay: 40 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleNotificationStack: React.FC<StyleNotificationStackProps> = ({
  notifications = DEFAULT_NOTIFICATIONS,
  showTitle = false,
  title = 'Notifications',
  cardWidth,
  slideDistance,
  springDamping = 14,
  springStiffness = 180,
  springMass = 0.6,
  showBadge = true,
  badgeCount = 3,
  badgeColor = '#ef4444',
  x = 0,
  y = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // Canvas-relative sizing
  const cardW = cardWidth ?? c.vw(30);
  const slideDist = slideDistance ?? c.vw(30);
  const avatarSize = c.vmin(4);
  const titleFs = c.vmin(2.4);
  const bodyFs = c.vmin(2);
  const cardPadding = c.vmin(2);
  const cardRadius = c.vmin(1.6);
  const badgeSize = c.vmin(2.2);
  const badgeFs = c.vmin(1.4);
  const cardGap = c.vmin(1.4);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: `${cardGap}px`,
        alignItems: 'flex-end',
      }}
    >
      {/* Optional title */}
      {showTitle && (
        <div
          style={{
            position: 'absolute',
            top: `-${c.vmin(6)}px`,
            left: 0,
            color: '#ffffff',
            fontSize: `${c.vmin(3.2)}px`,
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {title}
        </div>
      )}

      {/* Notification cards */}
      {notifications.map((notif, i) => {
        const delayedFrame = Math.max(0, frame - (notif.delay ?? i * 20));
        const slideIn = spring({
          frame: delayedFrame,
          fps,
          config: { damping: springDamping, stiffness: springStiffness, mass: springMass },
        });
        const translateX = interpolate(slideIn, [0, 1], [slideDist, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const opacity = interpolate(slideIn, [0, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={i}
            style={{
              transform: `translateX(${translateX}px)`,
              opacity,
              width: `${cardW}px`,
              padding: `${cardPadding}px`,
              borderRadius: `${cardRadius}px`,
              background: 'rgba(31, 41, 55, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: `${c.vmin(1.2)}px`,
              position: 'relative',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: '50%',
                background: notif.color ?? '#3b82f6',
                flexShrink: 0,
              }}
            />

            {/* Text content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: `${titleFs}px`,
                  fontWeight: 600,
                  marginBottom: `${c.vmin(0.4)}px`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {notif.title}
              </div>
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: `${bodyFs}px`,
                  lineHeight: 1.3,
                }}
              >
                {notif.body}
              </div>
            </div>

            {/* Badge on first card */}
            {i === 0 && showBadge && (
              <div
                style={{
                  position: 'absolute',
                  top: `-${badgeSize / 2}px`,
                  right: `-${badgeSize / 2}px`,
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: '50%',
                  background: badgeColor,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  fontSize: `${badgeFs}px`,
                  fontWeight: 'bold',
                }}
              >
                {badgeCount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

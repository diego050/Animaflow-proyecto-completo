import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface EmojiFloatProps extends UniversalProps {
  emoji?: string;
  count?: number;
  spread?: number;
  speed?: number;
}

export const EmojiFloat: React.FC<EmojiFloatProps> = ({
  emoji = '🔥',
  count = 10,
  spread = 300,
  speed = 1.0,
  x = 540,
  y = 1000,
  fontSize = 60,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  if (adjustedFrame === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        // Pseudo-random deterministic values
        const randomX = (Math.sin(i * 1234) * 0.5 + 0.5) * spread - spread / 2;
        const randomDelay = Math.abs(Math.sin(i * 5678)) * 30; // Stagger start times up to 30 frames
        const randomScale = 0.5 + Math.abs(Math.sin(i * 9012)) * 0.8;
        
        const emojiFrame = Math.max(0, adjustedFrame - randomDelay);
        
        // Progress from 0 to 1 over ~90 frames
        const progress = interpolate(emojiFrame * speed, [0, 90], [0, 1], { extrapolateRight: 'clamp' });
        
        if (progress === 0) return null;

        // Move up
        const currentY = y - progress * 600;
        // Wiggle X
        const currentX = x + randomX + Math.sin(progress * 10 + i) * 50;
        
        // Fade out at top
        const opacity = interpolate(progress, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${currentX}px`,
              top: `${currentY}px`,
              transform: `translate(-50%, -50%) scale(${randomScale})`,
              fontSize: `${fontSize}px`,
              opacity,
              filter: `drop-shadow(0 10px 10px rgba(0,0,0,0.2))`
            }}
          >
            {emoji}
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const TextReveal: React.FC<{
  text: string;
  color?: string;
  animation?: 'fade' | 'blur' | 'slide_up';
  glowIntensity?: number;
  x?: number;
  y?: number;
  fontSize?: number;
  width?: number;
}> = ({
  text,
  color = '#ffffff',
  animation = 'slide_up',
  glowIntensity = 0.5,
  x = 540,
  y = 960,
  fontSize = 60,
  width = 900,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(' ');

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
        gap: `${Math.max(10, fontSize * 0.3)}px`,
        zIndex: 10,
        textAlign: 'center',
      }}
    >
      {words.map((word, index) => {
        // Stagger: delay each word by 3 frames
        const delay = index * 3;
        const wordFrame = Math.max(0, frame - delay);

        // Spring animation from 0 to 1
        const progress = spring({
          fps,
          frame: wordFrame,
          config: {
            damping: 12,
            stiffness: 150,
          },
        });

        // Map progress to CSS properties
        const opacity = progress;
        
        let transform = 'none';
        let filter = 'none';

        if (animation === 'slide_up') {
          const y = interpolate(progress, [0, 1], [50, 0]);
          transform = `translateY(${y}px)`;
        } else if (animation === 'blur') {
          const blur = interpolate(progress, [0, 1], [20, 0]);
          filter = `blur(${blur}px)`;
        }

        const textShadow = glowIntensity > 0 
            ? `0 4px 20px rgba(0,0,0,0.8), 0 0 30px ${color}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`
            : '0 4px 20px rgba(0,0,0,0.8)';

        return (
          <span
            key={index}
            style={{
              color,
              fontSize,
              fontWeight: 900,
              opacity,
              transform,
              filter,
              textShadow,
              display: 'inline-block',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

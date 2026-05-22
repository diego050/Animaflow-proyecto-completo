import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const TextReveal: React.FC<{
  text: string;
  color?: string;
  animation?: 'fade' | 'blur' | 'slide_up';
  size?: 'normal' | 'large' | 'title';
  glowIntensity?: number;
}> = ({
  text,
  color = '#ffffff',
  animation = 'slide_up',
  size = 'large',
  glowIntensity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(' ');

  let fontSize = '60px';
  if (size === 'title') fontSize = '90px';
  if (size === 'normal') fontSize = '40px';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '15%',
        left: '5%',
        width: '90%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '20px',
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

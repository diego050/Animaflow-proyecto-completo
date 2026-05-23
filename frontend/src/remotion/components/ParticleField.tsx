import React from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import { UniversalProps } from './types';

export interface ParticleFieldProps extends UniversalProps {
  color1?: string; // Color of the particles
  color2?: string; // Background color
  density?: number; // Number of particles
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  color1 = '#ffffff',
  color2 = '#0f172a',
  density = 50,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { width, height } = useVideoConfig();

  // Create an array of particles
  const particles = Array.from({ length: density }).map((_, i) => {
    // Stable random values for this particle index
    const rX = random(`px-${i}`);
    const rY = random(`py-${i}`);
    const rSpeed = random(`pspeed-${i}`) * 2 + 1; // Speed between 1 and 3
    const rSize = random(`psize-${i}`) * 4 + 2; // Size between 2 and 6
    const rOpacity = random(`popacity-${i}`) * 0.5 + 0.2; // Opacity between 0.2 and 0.7

    // Initial positions
    const startX = rX * width;
    // We make them start slightly below the screen and distribute them up to the height
    const startY = rY * height + (height / 2);

    // Calculate current position
    // As frame increases, Y decreases (moves up)
    let currentY = startY - (adjustedFrame * rSpeed);

    // Loop the particles: if it goes off top, wrap around to bottom
    // We add 100 to make sure it spawns fully offscreen
    if (currentY < -100) {
       // A simple wrap around logic (using modulo doesn't work well if we want smooth respawn without teleporting visibly)
       // Actually, taking modulo of the total travel distance is easiest:
       currentY = height + 100 - ((-currentY) % (height + 200));
    }

    return {
      x: startX,
      y: currentY,
      size: rSize,
      opacity: rOpacity,
    };
  });

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: color2,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: color1,
            borderRadius: '50%',
            opacity: p.opacity,
            // Add a subtle glowing effect to the particles
            boxShadow: `0 0 ${p.size * 2}px ${color1}`,
          }}
        />
      ))}
    </div>
  );
};

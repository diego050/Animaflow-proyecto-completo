import React from 'react';
import { useCurrentFrame } from 'remotion';
import { UniversalProps } from './types';

export const FloatingBlobs: React.FC<{
  color1?: string;
  color2?: string;
  width?: number;
  height?: number;
} & UniversalProps> = ({
  color1 = '#f43f5e', // Rose
  color2 = '#f59e0b', // Amber
  x = 540,
  y = 960,
  delay = 0,
  width = 800,
  height = 800,
  color,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Rotate blobs
  const rotation1 = adjustedFrame * 1.5;
  const rotation2 = -adjustedFrame * 1.2;

  // Move them slightly to merge and unmerge
  const offsetX = Math.sin(adjustedFrame / 20) * 100;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 1,
        // The magic of Gooey effect in CSS:
        // Use an SVG filter to blur and contrast to merge alpha channels
        filter: 'url(#gooey-filter)',
      }}
    >
      <svg width={0} height={0}>
        <defs>
          <filter id="gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="40" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              // Increase alpha contrast: 1 0 0 0 0 ... 0 0 0 30 -15
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 40 -20"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Blob 1 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `calc(50% + ${offsetX}px)`,
          width: '400px',
          height: '400px',
          backgroundColor: color1,
          borderRadius: '50%', // Could use asymmetric radius too
          transform: `translate(-50%, -50%) rotate(${rotation1}deg)`,
          // Squish it a bit to make rotation obvious
          scale: '1 0.8',
        }}
      />

      {/* Blob 2 */}
      <div
        style={{
          position: 'absolute',
          top: `calc(50% + ${offsetX * 0.5}px)`,
          left: `calc(50% - ${offsetX}px)`,
          width: '350px',
          height: '350px',
          backgroundColor: color || color2,
          borderRadius: '50%',
          transform: `translate(-50%, -50%) rotate(${rotation2}deg)`,
          scale: '0.8 1',
        }}
      />
    </div>
  );
};

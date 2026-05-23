import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface GlobalVFXProps extends UniversalProps {
  intensity?: number; // 0 to 1
  withLensCurve?: boolean;
}

export const GlobalVFX: React.FC<GlobalVFXProps> = ({
  intensity = 0.5,
  withLensCurve = true,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Simple static noise pattern using SVG
  const noiseSvg = `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <filter id="noiseFilter">
        <feTurbulence 
          type="fractalNoise" 
          baseFrequency="0.65" 
          numOctaves="3" 
          stitchTiles="stitch"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
    </svg>
  `;

  // Encode for background image
  const encodedNoise = `url("data:image/svg+xml;utf8,${encodeURIComponent(noiseSvg)}")`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 9998, // Almost on top, but below final transitions if needed
        pointerEvents: 'none',
      }}
    >
      {/* Film Grain overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: encodedNoise,
          opacity: 0.15 * intensity,
          mixBlendMode: 'overlay',
          // Jitter the background position to make the noise dynamic
          backgroundPosition: `${(frame % 10) * 10}px ${(frame % 7) * 10}px`,
        }}
      />

      {/* Lens Curve / CRT effect */}
      {withLensCurve && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            // Inner shadow for vignette
            boxShadow: 'inset 0 0 150px rgba(0,0,0,0.8)',
            // Simulating RGB split (Chromatic Aberration) at the edges
            backdropFilter: 'drop-shadow(2px 0 0 rgba(255,0,0,0.5)) drop-shadow(-2px 0 0 rgba(0,255,255,0.5))',
          }}
        />
      )}
    </div>
  );
};

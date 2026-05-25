import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// GradientOverlay — Smooth color gradient transition between scenes.
// No AnimaComposer rendering — interpolates between two gradient stops
// to create a flowing color transition driven by progress (0→1).
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
}

export const GradientOverlay: React.FC<Props> = ({ progress }) => {
  // Gradient shifts from warm to cool as progress advances
  const r1 = Math.round(interpolate(progress, [0, 1], [255, 30]));
  const g1 = Math.round(interpolate(progress, [0, 1], [140, 60]));
  const b1 = Math.round(interpolate(progress, [0, 1], [80, 180]));

  const r2 = Math.round(interpolate(progress, [0, 1], [255, 100]));
  const g2 = Math.round(interpolate(progress, [0, 1], [200, 40]));
  const b2 = Math.round(interpolate(progress, [0, 1], [120, 120]));

  // Overlay opacity peaks mid-transition
  const overlayOpacity = Math.sin(progress * Math.PI) * 0.85;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, 
            rgba(${r1}, ${g1}, ${b1}, ${overlayOpacity}) 0%, 
            rgba(${r2}, ${g2}, ${b2}, ${overlayOpacity}) 50%, 
            rgba(${r1}, ${g1}, ${b1}, ${overlayOpacity * 0.5}) 100%)`,
        }}
      />

      {/* Soft center bloom */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '80%',
          height: '80%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, 
            rgba(255, 255, 255, ${overlayOpacity * 0.3}) 0%, 
            transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />
    </div>
  );
};

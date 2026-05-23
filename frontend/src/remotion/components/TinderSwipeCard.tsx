import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface TinderSwipeCardProps extends UniversalProps {
  name?: string;
  subtitle?: string;
  swipeFrame?: number;
  stampColor?: string;
  stampText?: string;
}

export const TinderSwipeCard: React.FC<TinderSwipeCardProps> = ({
  name = 'SaaS Startup', subtitle = 'Looking for growth',
  swipeFrame = 90, x = 540, y = 960,
  bgColor = '#ffffff', stampColor = '#22c55e', stampText = 'MATCH!', delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entranceScale = spring({ frame: adjustedFrame, fps, config: { damping: 12 } });
  const swipeProgress = spring({ frame: Math.max(0, adjustedFrame - swipeFrame), fps, config: { damping: 12, mass: 1, stiffness: 100 } });
  const offsetX = interpolate(swipeProgress, [0, 1], [0, 1000]);
  const rotation = interpolate(swipeProgress, [0, 1], [0, 25]);
  const matchScale = spring({ frame: Math.max(0, adjustedFrame - swipeFrame + 10), fps, config: { damping: 10, stiffness: 200 } });

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(calc(-50% + ${offsetX}px), -50%) scale(${entranceScale}) rotate(${rotation}deg)`,
      width: '600px', height: '850px', backgroundColor: bgColor, borderRadius: '30px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'flex-end', padding: '40px',
      fontFamily: 'Inter, sans-serif', zIndex: 50, overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#e2e8f0', zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '32px' }}>[Image]</div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', zIndex: 1 }} />
      <div style={{ zIndex: 2, width: '100%' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '48px', fontWeight: '800', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{name}</h2>
        <p style={{ margin: 0, fontSize: '28px', color: '#cbd5e1', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{subtitle}</p>
      </div>
      <div style={{
        position: 'absolute', top: '100px', left: '50px',
        border: `8px solid ${stampColor}`, color: stampColor,
        fontSize: '64px', fontWeight: '900', padding: '10px 30px', borderRadius: '20px',
        transform: `rotate(-15deg) scale(${matchScale})`, opacity: matchScale,
        zIndex: 5, textTransform: 'uppercase', letterSpacing: '2px',
        boxShadow: `0 0 20px ${stampColor}66`,
      }}>{stampText}</div>
    </div>
  );
};

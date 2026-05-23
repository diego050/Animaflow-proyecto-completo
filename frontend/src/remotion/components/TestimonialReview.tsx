import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface TestimonialReviewProps extends UniversalProps {
  author?: string;
  review?: string;
  rating?: number;
  starColor?: string;
}

export const TestimonialReview: React.FC<TestimonialReviewProps> = ({
  author = 'Sarah Jenkins',
  review = '"This tool saved our team 20 hours a week! Highly recommended."',
  rating = 5,
  starColor = '#fbbf24',
  bgColor = '#ffffff',
  textColor = '#334155',
  fontSize = 28,
  x = 540,
  y = 800,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const containerEntrance = spring({ frame: adjustedFrame, fps, config: { damping: 14, mass: 1 } });

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(-50%, -50%) scale(${containerEntrance})`, opacity: containerEntrance,
      width: '600px', backgroundColor: bgColor, borderRadius: '20px', padding: '30px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 40,
    }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[1, 2, 3, 4, 5].map((starIdx) => {
          const isGold = starIdx <= rating;
          const staggerFrame = 15 + starIdx * 5;
          const starScale = spring({ frame: Math.max(0, adjustedFrame - staggerFrame), fps, config: { damping: 10 } });
          const fillColor = adjustedFrame > staggerFrame && isGold ? starColor : '#e2e8f0';
          return (
            <div key={starIdx} style={{ transform: `scale(${adjustedFrame > staggerFrame ? starScale : 1})` }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill={fillColor} stroke={fillColor} strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: `${fontSize}px`, color: textColor, textAlign: 'center', fontStyle: 'italic', lineHeight: '1.4', margin: '0 0 20px 0' }}>
        {review}
      </p>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: textColor, textTransform: 'uppercase', letterSpacing: '1px' }}>
        — {author}
      </div>
    </div>
  );
};

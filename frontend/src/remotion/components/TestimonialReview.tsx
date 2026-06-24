import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface TestimonialReviewProps extends UniversalProps {
  author?: string;
  review?: string;
  rating?: number;
  starColor?: string;
  /** Color de las formas vacías (no calificadas). */
  emptyColor?: string;
  /** Forma de la calificación. */
  shape?: 'star' | 'circle' | 'heart';
  /** Color del nombre del autor. */
  authorColor?: string;
  /** Ancho de la tarjeta (px). */
  width?: number;
}

const SHAPE_PATHS: Record<string, string> = {
  star: 'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
  heart: 'M12 21s-7.5-4.9-9.5-9.1C1 8.5 2.8 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.2 0 5 3 3.5 6.4C19.5 16.1 12 21 12 21z',
};

export const TestimonialReview: React.FC<TestimonialReviewProps> = ({
  author = 'Sarah Jenkins',
  review = '"This tool saved our team 20 hours a week! Highly recommended."',
  rating = 5,
  starColor = '#fbbf24',
  emptyColor = '#e2e8f0',
  shape = 'star',
  bgColor = '#ffffff',
  textColor = '#334155',
  authorColor,
  fontSize,
  width,
  x = 540,
  y = 800,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const containerEntrance = spring({ frame: adjustedFrame, fps, config: { damping: 14, mass: 1 } });
  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(3.8);
  const cardW = width && width > 0 ? width : c.vw(82);
  const authorC = authorColor || textColor;
  const shapeSize = c.vmin(6);

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(-50%, -50%) scale(${containerEntrance})`, opacity: containerEntrance,
      width: `${cardW}px`, backgroundColor: bgColor, borderRadius: `${c.vmin(3)}px`, padding: `${c.vmin(4)}px`,
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box', zIndex: 40,
    }}>
      <div style={{ display: 'flex', gap: `${c.vmin(1.4)}px`, marginBottom: `${c.vmin(3)}px` }}>
        {[1, 2, 3, 4, 5].map((idx) => {
          const filled = idx <= rating;
          const staggerFrame = 15 + idx * 5;
          const shapeScale = spring({ frame: Math.max(0, adjustedFrame - staggerFrame), fps, config: { damping: 10 } });
          const fillColor = adjustedFrame > staggerFrame && filled ? starColor : emptyColor;
          return (
            <div key={idx} style={{ transform: `scale(${adjustedFrame > staggerFrame ? shapeScale : 1})` }}>
              <svg width={shapeSize} height={shapeSize} viewBox="0 0 24 24" fill={fillColor} stroke={fillColor} strokeWidth={shape === 'star' ? 2 : 0}>
                {shape === 'circle'
                  ? <circle cx="12" cy="12" r="9" />
                  : <path d={SHAPE_PATHS[shape]} />}
              </svg>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: `${fs}px`, color: textColor, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4, margin: `0 0 ${c.vmin(3)}px 0`, overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
        {review}
      </p>
      <div style={{ fontSize: `${c.vmin(3)}px`, fontWeight: 'bold', color: authorC, textTransform: 'uppercase', letterSpacing: '1px', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%', textAlign: 'center' }}>
        — {author}
      </div>
    </div>
  );
};

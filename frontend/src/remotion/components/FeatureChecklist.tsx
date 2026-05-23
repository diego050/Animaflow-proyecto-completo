import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { UniversalProps } from './types';

interface FeatureChecklistProps extends UniversalProps {
  itemsStr?: string;
  checkColor?: string;
}

export const FeatureChecklist: React.FC<FeatureChecklistProps> = ({
  itemsStr = 'Free Worldwide Shipping,Premium Quality Materials,30-Day Money Back Guarantee',
  checkColor = '#10b981',
  textColor = '#1e293b',
  fontSize = 32,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const items = itemsStr.split(',').map(s => s.trim());

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', gap: '30px', fontFamily: 'Inter, sans-serif', zIndex: 55,
    }}>
      {items.map((item, i) => {
        const itemDelay = 10 + i * 15;
        const checkProgress = interpolate(adjustedFrame, [itemDelay, itemDelay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const textOpacity = interpolate(adjustedFrame, [itemDelay + 5, itemDelay + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: `${checkColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={checkColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" strokeDasharray={30} strokeDashoffset={30 - (checkProgress * 30)} />
              </svg>
            </div>
            <div style={{ fontSize: `${fontSize}px`, fontWeight: '600', color: textColor, opacity: textOpacity, transform: `translateX(${(1 - textOpacity) * -20}px)` }}>
              {item}
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface SizeSelectorProps extends UniversalProps {
  sizes?: string; // Comma separated
  selectedSize?: string;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  sizes = 'XS,S,M,L,XL',
  selectedSize = 'M',
  color = '#0f172a', // Selected background
  bgColor = '#ffffff', // Unselected background
  textColor = '#0f172a', // Unselected text
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const sizeArr = sizes.split(',');
  const selectedIndex = sizeArr.indexOf(selectedSize);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, display: 'flex', gap: '20px', fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {sizeArr.map((s, idx) => {
        const isSelected = idx === selectedIndex;
        // Selection animation triggers at frame 30
        const clickFrame = Math.max(0, adjustedFrame - 30);
        
        // Base pop in
        const pop = spring({ frame: Math.max(0, adjustedFrame - (idx * 5)), fps, config: { damping: 12 } });
        
        // Select pop
        const selectAnim = isSelected ? spring({ frame: clickFrame, fps, config: { damping: 10 } }) : 0;
        
        const currentScale = pop + (selectAnim * 0.1);
        const currentBg = isSelected && clickFrame > 0 ? color : bgColor;
        const currentText = isSelected && clickFrame > 0 ? '#ffffff' : textColor;

        return (
          <div key={idx} style={{ transform: `scale(${currentScale})`, width: '100px', height: '100px', borderRadius: '50%', backgroundColor: currentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: currentText, border: `2px solid ${isSelected && clickFrame > 0 ? color : '#cbd5e1'}`, boxShadow: isSelected && clickFrame > 0 ? `0 10px 20px ${color}80` : '0 5px 10px rgba(0,0,0,0.1)' }}>
            {s}
          </div>
        );
      })}
    </div>
  );
};

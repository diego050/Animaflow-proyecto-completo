import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const sizeArr = sizes.split(',');
  const selectedIndex = sizeArr.indexOf(selectedSize);
  // Relativo al lienzo (antes px: circle 100, fontSize 32, gap 20).
  const circle = c.vmin(15);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, display: 'flex', gap: `${c.vmin(3)}px`, fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {sizeArr.map((s, idx) => {
        const isSelected = idx === selectedIndex;
        const clickFrame = Math.max(0, adjustedFrame - 30);
        const pop = spring({ frame: Math.max(0, adjustedFrame - idx * 5), fps, config: { damping: 12 } });
        const selectAnim = isSelected ? spring({ frame: clickFrame, fps, config: { damping: 10 } }) : 0;
        const currentScale = pop + selectAnim * 0.1;
        const currentBg = isSelected && clickFrame > 0 ? color : bgColor;
        const currentText = isSelected && clickFrame > 0 ? '#ffffff' : textColor;

        return (
          <div key={idx} style={{ transform: `scale(${currentScale})`, width: circle, height: circle, borderRadius: '50%', backgroundColor: currentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${c.vmin(5)}px`, fontWeight: 'bold', color: currentText, border: `${c.vmin(0.4)}px solid ${isSelected && clickFrame > 0 ? color : '#cbd5e1'}`, boxShadow: isSelected && clickFrame > 0 ? `0 10px 20px ${color}80` : '0 5px 10px rgba(0,0,0,0.1)' }}>
            {s}
          </div>
        );
      })}
    </div>
  );
};

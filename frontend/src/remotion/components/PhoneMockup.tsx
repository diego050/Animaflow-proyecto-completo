import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export interface PhoneMockupProps extends UniversalProps {
  text: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  text,
  x = 540,
  y = 960, // Center Y
  textColor = '#1e293b',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps, height } = useVideoConfig();

  // Slide up animation
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 14,
      stiffness: 90,
    },
  });

  // Start offscreen at the bottom, move to Y
  const currentY = height + 500 - (progress * (height + 500 - y));

  return (
    <div
      style={{
        position: 'absolute',
        top: `${currentY}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: '450px',
        height: '800px',
        backgroundColor: '#ffffff',
        borderRadius: '50px',
        border: '14px solid #0f172a', // The phone bezel
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {/* The Notch (Dynamic Island) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '150px',
          height: '35px',
          backgroundColor: '#0f172a',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      />

      {/* Screen Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          backgroundColor: '#f8fafc',
        }}
      >
        <span
          style={{
            fontSize: '48px',
            fontWeight: 700,
            color: textColor,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

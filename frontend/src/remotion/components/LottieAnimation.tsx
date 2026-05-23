import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface LottieAnimationProps extends UniversalProps {
  lottieUrl?: string;
  loop?: boolean;
  speed?: number;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  lottieUrl = '',
  loop = true,
  speed = 1.0,
  x = 540,
  y = 540,
  width = 400,
  height = 400,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 12 } });

  // In a real Remotion setup, we would use @remotion/lottie.
  // For the React preview, we render a placeholder. 
  // In After Effects, the AE Generator will import the actual .json file.

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(241, 245, 249, 0.5)',
        border: '2px dashed #94a3b8',
        borderRadius: '20px',
        color: '#64748b',
        fontFamily: 'monospace',
        fontSize: '16px',
        textAlign: 'center',
        padding: '20px',
        zIndex: 50,
      }}
    >
      <div>
        <strong>Lottie Animation</strong><br/>
        {lottieUrl ? lottieUrl.split('/').pop() : 'No URL Provided'}<br/>
        <small>Loop: {loop ? 'Yes' : 'No'} | Speed: {speed}x</small>
      </div>
    </div>
  );
};

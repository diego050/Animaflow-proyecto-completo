import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface YouTubeEndScreenProps extends UniversalProps {
  title?: string;
  subscribeColor?: string;
}

export const YouTubeEndScreen: React.FC<YouTubeEndScreenProps> = ({
  title = 'Thanks for watching!',
  subscribeColor = '#ff0000',
  bgColor = 'rgba(0, 0, 0, 0.8)',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrances
  const bgOp = spring({ frame: adjustedFrame, fps, config: { damping: 20 } });
  const scaleVideos = spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 14 } });
  const scaleSub = spring({ frame: Math.max(0, adjustedFrame - 30), fps, config: { damping: 12, mass: 1.5 } });

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: bgColor, opacity: bgOp, zIndex: 100, fontFamily: 'Roboto, Arial, sans-serif' }}>
      
      {/* Title */}
      <div style={{ position: 'absolute', top: '15%', width: '100%', textAlign: 'center', fontSize: '64px', fontWeight: 'bold', color: textColor, textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
        {title}
      </div>

      {/* Video Slots */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '80px' }}>
        <div style={{ width: '400px', height: '225px', backgroundColor: '#333333', border: '4px solid #ffffff', borderRadius: '12px', transform: `scale(${scaleVideos})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: '24px', opacity: 0.5 }}>Next Video</div>
        </div>
        <div style={{ width: '400px', height: '225px', backgroundColor: '#333333', border: '4px solid #ffffff', borderRadius: '12px', transform: `scale(${scaleVideos})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: '24px', opacity: 0.5 }}>Recommended</div>
        </div>
      </div>

      {/* Subscribe Button */}
      <div style={{ position: 'absolute', top: '75%', left: '50%', transform: `translate(-50%, -50%) scale(${scaleSub})`, display: 'flex', alignItems: 'center', gap: '30px' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#ffffff', border: `6px solid ${subscribeColor}` }} />
        <div style={{ padding: '20px 40px', backgroundColor: subscribeColor, color: '#ffffff', fontSize: '32px', fontWeight: 'bold', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          SUBSCRIBE
        </div>
      </div>

    </div>
  );
};

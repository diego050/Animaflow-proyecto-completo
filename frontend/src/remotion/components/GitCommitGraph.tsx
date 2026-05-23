import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface GitCommitGraphProps extends UniversalProps {
  branches?: number;
  nodeColor?: string;
  mergeFrame?: number;
}

export const GitCommitGraph: React.FC<GitCommitGraphProps> = ({
  branches = 2,
  nodeColor = '#3b82f6',
  color = '#334155', // Line color
  x = 540,
  y = 540,
  mergeFrame = 90,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // The graph flows from bottom to top
  const graphHeight = 600;
  
  // Progress from bottom to top
  const drawProgress = interpolate(adjustedFrame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  const mergeProgress = interpolate(Math.max(0, adjustedFrame - mergeFrame), [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: '400px', height: `${graphHeight}px`, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 40 }}>
      {/* Main Trunk */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '8px', height: `${drawProgress * graphHeight}px`, backgroundColor: color, borderRadius: '4px' }} />
      
      {/* Commits on main trunk */}
      {[0.2, 0.5, 0.8].map((pos, i) => {
        const nodeY = pos * graphHeight;
        const nodeVisible = (drawProgress * graphHeight) >= nodeY;
        const nodeScale = spring({ frame: nodeVisible ? Math.max(0, adjustedFrame - (pos * 60)) : 0, fps, config: { damping: 10 } });
        
        return (
          <div key={`main-${i}`} style={{ position: 'absolute', bottom: `${nodeY}px`, left: '50%', transform: `translate(-50%, 50%) scale(${nodeScale})`, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: nodeColor, border: `4px solid ${color}`, zIndex: 2 }} />
        );
      })}

      {/* Feature Branch */}
      {branches > 1 && (
        <>
          {/* Branch out path (SVG) */}
          <div style={{ position: 'absolute', bottom: '20%', left: '0', width: '100%', height: '80%', zIndex: 1 }}>
            <svg width="400" height="480" viewBox="0 0 400 480">
              {/* Branch off line */}
              <path d="M 200 480 C 200 420, 280 420, 280 360 L 280 120" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" strokeDasharray={400} strokeDashoffset={400 - (drawProgress * 400)} />
              
              {/* Merge back line */}
              <path d="M 280 120 C 280 60, 200 60, 200 0" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" strokeDasharray={200} strokeDashoffset={200 - (mergeProgress * 200)} />
            </svg>
          </div>
          
          {/* Commits on feature branch */}
          {[0.4, 0.6].map((pos, i) => {
            const nodeY = pos * graphHeight;
            const nodeVisible = (drawProgress * graphHeight) >= nodeY;
            const nodeScale = spring({ frame: nodeVisible ? Math.max(0, adjustedFrame - (pos * 60)) : 0, fps, config: { damping: 10 } });
            
            return (
              <div key={`feat-${i}`} style={{ position: 'absolute', bottom: `${nodeY}px`, left: 'calc(50% + 80px)', transform: `translate(-50%, 50%) scale(${nodeScale})`, width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#8b5cf6', border: `4px solid #4c1d95`, zIndex: 2 }} />
            );
          })}
          
          {/* Merge Commit */}
          <div style={{ position: 'absolute', bottom: `${0.8 * graphHeight}px`, left: '50%', transform: `translate(-50%, 50%) scale(${spring({ frame: Math.max(0, adjustedFrame - mergeFrame - 15), fps, config: { damping: 10 } })})`, width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f59e0b', border: `4px solid ${color}`, zIndex: 3 }} />
        </>
      )}
    </div>
  );
};

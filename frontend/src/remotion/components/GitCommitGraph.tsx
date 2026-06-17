import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface GitCommitGraphProps extends UniversalProps {
  branches?: number;
  nodeColor?: string;
  mergeFrame?: number;
  branchColor?: string;
  mergeColor?: string;
  lineWidth?: number;
  nodeSize?: number;
  graphHeight?: number;
}

export const GitCommitGraph: React.FC<GitCommitGraphProps> = ({
  branches = 2,
  nodeColor = '#3b82f6',
  color = '#334155', // Line color
  branchColor = '#8b5cf6',
  mergeColor = '#f59e0b',
  lineWidth = 8,
  nodeSize = 24,
  graphHeight = 600,
  x = 540,
  y = 540,
  mergeFrame = 90,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const mergeNodeSize = nodeSize + 8;
  
  // Progress from bottom to top
  const drawProgress = interpolate(adjustedFrame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  const mergeProgress = interpolate(Math.max(0, adjustedFrame - mergeFrame), [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: '400px', height: `${graphHeight}px`, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 40 }}>
      {/* Main Trunk */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: `${lineWidth}px`, height: `${drawProgress * graphHeight}px`, backgroundColor: color, borderRadius: `${lineWidth / 2}px` }} />
      
      {/* Commits on main trunk */}
      {[0.2, 0.5, 0.8].map((pos, i) => {
        const nodeY = pos * graphHeight;
        const nodeVisible = (drawProgress * graphHeight) >= nodeY;
        const nodeScale = spring({ frame: nodeVisible ? Math.max(0, adjustedFrame - (pos * 60)) : 0, fps, config: { damping: 10 } });
        
        return (
          <div key={`main-${i}`} style={{ position: 'absolute', bottom: `${nodeY}px`, left: '50%', transform: `translate(-50%, 50%) scale(${nodeScale})`, width: `${nodeSize}px`, height: `${nodeSize}px`, borderRadius: '50%', backgroundColor: nodeColor, border: `4px solid ${color}`, zIndex: 2 }} />
        );
      })}

      {/* Feature Branch */}
      {branches > 1 && (
        <>
          {/* Branch out path (SVG) */}
          <div style={{ position: 'absolute', bottom: '20%', left: '0', width: '100%', height: '80%', zIndex: 1 }}>
            <svg width="400" height="480" viewBox="0 0 400 480">
              {/* Branch off line */}
              <path d="M 200 480 C 200 420, 280 420, 280 360 L 280 120" fill="none" stroke={branchColor} strokeWidth={lineWidth} strokeLinecap="round" strokeDasharray={400} strokeDashoffset={400 - (drawProgress * 400)} />

              {/* Merge back line */}
              <path d="M 280 120 C 280 60, 200 60, 200 0" fill="none" stroke={branchColor} strokeWidth={lineWidth} strokeLinecap="round" strokeDasharray={200} strokeDashoffset={200 - (mergeProgress * 200)} />
            </svg>
          </div>
          
          {/* Commits on feature branch */}
          {[0.4, 0.6].map((pos, i) => {
            const nodeY = pos * graphHeight;
            const nodeVisible = (drawProgress * graphHeight) >= nodeY;
            const nodeScale = spring({ frame: nodeVisible ? Math.max(0, adjustedFrame - (pos * 60)) : 0, fps, config: { damping: 10 } });
            
            return (
              <div key={`feat-${i}`} style={{ position: 'absolute', bottom: `${nodeY}px`, left: 'calc(50% + 80px)', transform: `translate(-50%, 50%) scale(${nodeScale})`, width: `${nodeSize}px`, height: `${nodeSize}px`, borderRadius: '50%', backgroundColor: branchColor, border: `4px solid #4c1d95`, zIndex: 2 }} />
            );
          })}

          {/* Merge Commit */}
          <div style={{ position: 'absolute', bottom: `${0.8 * graphHeight}px`, left: '50%', transform: `translate(-50%, 50%) scale(${spring({ frame: Math.max(0, adjustedFrame - mergeFrame - 15), fps, config: { damping: 10 } })})`, width: `${mergeNodeSize}px`, height: `${mergeNodeSize}px`, borderRadius: '50%', backgroundColor: mergeColor, border: `4px solid ${color}`, zIndex: 3 }} />
        </>
      )}
    </div>
  );
};

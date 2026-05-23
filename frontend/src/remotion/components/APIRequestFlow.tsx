import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface APIRequestFlowProps extends UniversalProps {
  method?: string;
  endpoint?: string;
  responseCode?: number;
}

export const APIRequestFlow: React.FC<APIRequestFlowProps> = ({
  method = 'POST',
  endpoint = '/api/v1/generate',
  responseCode = 200,
  color = '#3b82f6',
  bgColor = '#1e293b',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  fontSize = 24,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Box entrance
  const boxScale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Arrow progress
  const arrowProgress = interpolate(adjustedFrame, [15, 45], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  
  // Response appearance
  const responseOpacity = interpolate(adjustedFrame, [50, 60], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const responseScale = spring({ frame: Math.max(0, adjustedFrame - 50), fps, config: { damping: 12 } });

  const isSuccess = responseCode >= 200 && responseCode < 300;
  const statusColor = isSuccess ? '#22c55e' : '#ef4444';
  const methodColor = method === 'GET' ? '#38bdf8' : method === 'POST' ? '#22c55e' : method === 'DELETE' ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: '30px', fontFamily: 'Inter, sans-serif', zIndex: 45 }}>
      {/* Client Box */}
      <div style={{ width: '300px', padding: '20px', backgroundColor: bgColor, borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', transform: `scale(${boxScale})`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <div style={{ backgroundColor: methodColor, color: 'white', padding: '5px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: `${fontSize - 4}px` }}>{method}</div>
          <div style={{ color: '#94a3b8', fontSize: `${fontSize - 4}px`, fontFamily: 'monospace' }}>{endpoint}</div>
        </div>
        <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
          <pre style={{ margin: 0, color: '#38bdf8', fontSize: `${fontSize - 8}px` }}>
{`{
  "prompt": "Epic sci-fi scene",
  "aspect_ratio": "16:9"
}`}
          </pre>
        </div>
      </div>

      {/* Connecting Arrow */}
      <div style={{ width: '200px', height: '60px', position: 'relative', opacity: boxScale }}>
        <div style={{ position: 'absolute', top: '30px', left: 0, width: '100%', height: '4px', backgroundColor: '#334155', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', top: '30px', left: 0, width: `${arrowProgress * 100}%`, height: '4px', backgroundColor: color, borderRadius: '2px', boxShadow: `0 0 10px ${color}` }} />
        {/* Arrow head */}
        <div style={{ position: 'absolute', top: '20px', left: `${arrowProgress * 100}%`, transform: 'translateX(-10px)', width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: `20px solid ${color}`, opacity: arrowProgress > 0 ? 1 : 0 }} />
      </div>

      {/* Server Response Box */}
      <div style={{ width: '300px', padding: '20px', backgroundColor: bgColor, borderRadius: '16px', boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 0 2px ${statusColor}`, transform: `scale(${responseScale})`, opacity: responseOpacity, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <div style={{ backgroundColor: statusColor, color: 'white', padding: '5px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: `${fontSize - 4}px` }}>{responseCode}</div>
          <div style={{ color: statusColor, fontSize: `${fontSize - 4}px`, fontWeight: 'bold' }}>{isSuccess ? 'OK' : 'ERROR'}</div>
        </div>
        <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
          <pre style={{ margin: 0, color: '#22c55e', fontSize: `${fontSize - 8}px` }}>
{`{
  "status": "success",
  "data": {
    "job_id": "8f92a",
    "eta": "15s"
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

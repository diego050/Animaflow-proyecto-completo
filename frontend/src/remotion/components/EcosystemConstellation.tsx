/**
 * EcosystemConstellation — A central node with satellites orbiting around it on
 * a ring, connected by lines (ecosystem / integrations / hub and spoke /
 * constellation / network). Satellites rotate continuously.
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * All sizing via useCanvas(). Orbit driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface EcosystemConstellationProps extends UniversalProps {
  satelliteCount?: number;
  centerLabel?: string;
  labels?: string[];
  accentColor?: string;
  satelliteColor?: string;
  lineColor?: string;
  centerColor?: string;
  textColor?: string;
  radius?: number;
  centerSize?: number;
  satelliteSize?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const EcosystemConstellation: React.FC<EcosystemConstellationProps> = ({
  x = 540,
  y = 960,
  satelliteCount = 6,
  centerLabel = 'V',
  labels,
  accentColor = '#a855f7',
  satelliteColor = '#1e1b29',
  lineColor = 'rgba(168,85,247,0.35)',
  centerColor = '#a855f7',
  textColor = '#ffffff',
  radius,
  centerSize,
  satelliteSize,
  speed = 1,
  opacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const t = (frame / 60) * Math.max(0.05, speed);

  const n = Math.max(2, Math.min(12, Math.round(satelliteCount)));
  const ring = radius ?? c.vmin(28);
  const center = centerSize ?? c.vmin(18);
  const sat = satelliteSize ?? c.vmin(9);
  const labelList = Array.isArray(labels) ? labels : [];

  const sats = Array.from({ length: n }).map((_, i) => {
    const angle = (i / n) * Math.PI * 2 + t;
    return { sx: Math.cos(angle) * ring, sy: Math.sin(angle) * ring, label: labelList[i] };
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        opacity,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Connecting lines (SVG centered on the hub) */}
      <svg
        width={ring * 2 + sat * 2}
        height={ring * 2 + sat * 2}
        viewBox={`${-ring - sat} ${-ring - sat} ${ring * 2 + sat * 2} ${ring * 2 + sat * 2}`}
        style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', overflow: 'visible' }}
      >
        {sats.map((s, i) => (
          <line key={i} x1={0} y1={0} x2={s.sx} y2={s.sy} stroke={lineColor} strokeWidth={2} />
        ))}
      </svg>

      {/* Satellites */}
      {sats.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `calc(50% + ${s.sx}px)`,
            top: `calc(50% + ${s.sy}px)`,
            width: `${sat}px`,
            height: `${sat}px`,
            borderRadius: '50%',
            backgroundColor: satelliteColor,
            border: `${c.vmin(0.5)}px solid ${accentColor}`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColor,
            fontSize: `${sat * 0.4}px`,
            fontWeight: 600,
          }}
        >
          {s.label ?? ''}
        </div>
      ))}

      {/* Center hub */}
      <div
        style={{
          position: 'relative',
          width: `${center}px`,
          height: `${center}px`,
          borderRadius: '50%',
          backgroundColor: centerColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
          fontSize: `${center * 0.45}px`,
          fontWeight: 800,
          boxShadow: `0 0 ${c.vmin(6)}px ${accentColor}`,
        }}
      >
        {centerLabel}
      </div>
    </div>
  );
};

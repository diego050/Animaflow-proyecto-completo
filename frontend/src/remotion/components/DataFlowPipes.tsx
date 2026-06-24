/**
 * DataFlowPipes — Circuit-board style pipes connecting labeled nodes, with
 * colored pulses that travel along the pipes (data flow / pipeline / ETL /
 * architecture diagram). Distinct from NetworkNodes (proximity neural net).
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * Deterministic: pulses driven by useCurrentFrame() via strokeDashoffset.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface NodeDef {
  cx: number;
  cy: number;
  label: string;
}

interface DataFlowPipesProps extends UniversalProps {
  pipeColor?: string;
  pulseColor?: string;
  /** Length of each travelling pulse (svg units). */
  pulseLength?: number;
  /** Frames for a pulse to advance one spacing. */
  pulseDuration?: number;
  nodeColor?: string;
  textColor?: string;
  accent?: string;
  /** Node labels (source → process → store / output). */
  nodes?: string[];
  speed?: number;
  style?: Record<string, unknown>;
}

// Fixed orthogonal layout in a 1000×600 viewBox (scaled by the container).
const NODES: NodeDef[] = [
  { cx: 130, cy: 300, label: 'Source' },
  { cx: 500, cy: 300, label: 'Process' },
  { cx: 870, cy: 160, label: 'Store' },
  { cx: 870, cy: 440, label: 'Output' },
];
const PIPES = [
  'M 220 300 H 410',
  'M 590 300 H 740 V 160 H 780',
  'M 590 300 H 740 V 440 H 780',
];
const NODE_W = 180;
const NODE_H = 72;

export const DataFlowPipes: React.FC<DataFlowPipesProps> = ({
  x = 540,
  y = 960,
  pipeColor = '#1f1f23',
  pulseColor = '#22d3ee',
  pulseLength = 60,
  pulseDuration = 36,
  nodeColor = '#0a0a0a',
  textColor = '#fafafa',
  accent = '#22d3ee',
  nodes,
  speed = 1,
  opacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  const labels = Array.isArray(nodes) && nodes.length ? nodes : NODES.map((n) => n.label);
  const gap = 240;
  const cycle = pulseLength + gap;
  const v = (cycle / Math.max(1, pulseDuration)) * Math.max(0.05, speed);
  const dashOffset = -((frame * v) % cycle);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${c.vw(90)}px`,
        opacity,
        ...style,
      }}
    >
      <svg viewBox="0 0 1000 600" width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {/* Base pipes */}
        {PIPES.map((d, i) => (
          <path key={`base-${i}`} d={d} fill="none" stroke={pipeColor} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* Travelling pulses */}
        {PIPES.map((d, i) => (
          <path
            key={`pulse-${i}`}
            d={d}
            fill="none"
            stroke={pulseColor}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${pulseLength} ${gap}`}
            strokeDashoffset={dashOffset}
            style={{ filter: `drop-shadow(0 0 8px ${pulseColor})` }}
          />
        ))}
        {/* Nodes */}
        {NODES.map((n, i) => (
          <g key={`node-${i}`}>
            <rect
              x={n.cx - NODE_W / 2}
              y={n.cy - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={16}
              fill={nodeColor}
              stroke={accent}
              strokeWidth={2}
            />
            <text
              x={n.cx}
              y={n.cy}
              fill={textColor}
              fontSize={28}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight={600}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {labels[i] ?? NODES[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

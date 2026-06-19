import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface GitCommitGraphProps extends UniversalProps {
  /** Nº de commits en el trunk principal. */
  commits?: number;
  /** Nº de ramas (feature branches) que salen y se fusionan. */
  branches?: number;
  nodeColor?: string;
  branchColor?: string;
  mergeColor?: string;
  lineWidth?: number;
  nodeSize?: number;
  graphHeight?: number;
}

export const GitCommitGraph: React.FC<GitCommitGraphProps> = ({
  commits = 4,
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
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const commitCount = Math.max(2, Math.round(commits));
  const branchCount = Math.max(0, Math.round(branches));

  // ── Geometría (SVG, y hacia abajo) ──────────────────────────────────────
  const branchGap = 90;
  const trunkX = 60;
  const W = trunkX + Math.max(1, branchCount) * branchGap + 40;
  const spacing = graphHeight / (commitCount + 1);
  const trunkNodeY = (k: number) => graphHeight - (k + 1) * spacing;
  const topY = trunkNodeY(commitCount - 1);

  // Crece de abajo hacia arriba en ~60 frames.
  const drawProgress = interpolate(adjustedFrame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });
  // Frame aproximado en el que el trazo alcanza una altura `yy`.
  const appearFrame = (yy: number) => ((graphHeight - yy) / graphHeight) * 60;
  const nodeSpring = (yy: number, extra = 0) =>
    spring({ frame: Math.max(0, adjustedFrame - appearFrame(yy) - extra), fps, config: { damping: 12 } });

  // Reparte cada rama entre dos commits del trunk (fork → merge).
  const branchSpecs = Array.from({ length: branchCount }).map((_, i) => {
    const forkIdx = Math.min(commitCount - 2, 1 + (i % Math.max(1, commitCount - 2)));
    const mergeIdx = Math.min(commitCount - 1, forkIdx + 1 + (i % 2));
    return {
      i,
      branchX: trunkX + (i + 1) * branchGap,
      forkY: trunkNodeY(forkIdx),
      mergeY: trunkNodeY(mergeIdx),
      midY: (trunkNodeY(forkIdx) + trunkNodeY(mergeIdx)) / 2,
      mergeIdx,
    };
  });
  const mergeTargets = new Set(branchSpecs.map((b) => b.mergeIdx));

  const r = nodeSize / 2;
  const dashLen = 2000;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: `${W}px`, height: `${graphHeight}px`, zIndex: 40 }}>
      <svg width={W} height={graphHeight} viewBox={`0 0 ${W} ${graphHeight}`}>
        {/* Ramas: salen del trunk, suben hasta su commit y se fusionan de vuelta */}
        {branchSpecs.map((b) => {
          const d = `M ${trunkX} ${b.forkY} C ${trunkX} ${(b.forkY + b.midY) / 2}, ${b.branchX} ${(b.forkY + b.midY) / 2}, ${b.branchX} ${b.midY} C ${b.branchX} ${(b.midY + b.mergeY) / 2}, ${trunkX} ${(b.midY + b.mergeY) / 2}, ${trunkX} ${b.mergeY}`;
          return (
            <path
              key={`branch-${b.i}`}
              d={d}
              fill="none"
              stroke={branchColor}
              strokeWidth={lineWidth}
              strokeLinecap="round"
              strokeDasharray={dashLen}
              strokeDashoffset={dashLen * (1 - drawProgress)}
            />
          );
        })}

        {/* Trunk principal (crece de abajo hacia arriba) */}
        <line
          x1={trunkX}
          y1={graphHeight}
          x2={trunkX}
          y2={topY}
          stroke={color}
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeDasharray={graphHeight}
          strokeDashoffset={graphHeight * (1 - drawProgress)}
        />

        {/* Commit en cada rama */}
        {branchSpecs.map((b) => (
          <circle
            key={`bnode-${b.i}`}
            cx={b.branchX}
            cy={b.midY}
            r={r * nodeSpring(b.midY, 6)}
            fill={branchColor}
            stroke={color}
            strokeWidth={4}
          />
        ))}

        {/* Nodos del trunk (los de fusión resaltados con mergeColor) */}
        {Array.from({ length: commitCount }).map((_, k) => {
          const yy = trunkNodeY(k);
          const isMerge = mergeTargets.has(k);
          return (
            <circle
              key={`tnode-${k}`}
              cx={trunkX}
              cy={yy}
              r={(isMerge ? r + 4 : r) * nodeSpring(yy)}
              fill={isMerge ? mergeColor : nodeColor}
              stroke={color}
              strokeWidth={4}
            />
          );
        })}
      </svg>
    </div>
  );
};

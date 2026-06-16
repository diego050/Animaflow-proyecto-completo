import React from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import type { UniversalProps } from "./types";

export interface NetworkNodesProps extends UniversalProps {
  nodeColor?: string;
  lineColor?: string;
  /** Número de nodos (3-60). */
  nodeCount?: number;
  /** Distancia (px) bajo la cual dos nodos se conectan. Default ~22% del lado menor. */
  connectionDistance?: number;
  /** Velocidad de la deriva ambiental. */
  speed?: number;
  /** Alias usado por la IA (sobrescribe nodeColor). */
  color?: string;
  /** Semilla para variar la disposición de forma determinista. */
  seed?: number;
  /** Opacidad global (universal, la IA la usa para atenuar el fondo). */
  opacity?: number;
}

/**
 * NetworkNodes — fondo ambiental de "red neuronal" a pantalla completa.
 *
 * - Background role: llena el lienzo (no es una cajita centrada).
 * - Determinista: posiciones vía `random(seed)`, deriva vía `frame` (sin Math.random).
 * - Las conexiones se calculan POR PROXIMIDAD cada frame → al derivar los nodos,
 *   las líneas aparecen/desaparecen como una red viva.
 * - `nodeCount` controla la densidad; `opacity` (universal) se respeta.
 */
export const NetworkNodes: React.FC<NetworkNodesProps> = ({
  nodeColor = '#38bdf8',
  lineColor,
  nodeCount = 18,
  connectionDistance,
  speed = 1,
  color,
  seed = 0,
  opacity = 1,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);
  const t = (adjustedFrame / fps) * speed;

  const dots = color ?? nodeColor;
  const links = lineColor ?? dots;
  const rootOpacity = Math.min(1, Math.max(0, opacity));

  const n = Math.min(60, Math.max(3, Math.round(nodeCount)));
  const maxDist = connectionDistance ?? Math.min(width, height) * 0.22;

  // Nodos deterministas con deriva ambiental lenta.
  const nodes = Array.from({ length: n }).map((_, i) => {
    const key = `nn-${seed}-${i}`;
    const baseX = random(`${key}-x`) * width;
    const baseY = random(`${key}-y`) * height;
    const phase = random(`${key}-p`) * Math.PI * 2;
    const ampX = width * 0.04;
    const ampY = height * 0.04;
    const x = baseX + Math.sin(t * 0.6 + phase) * ampX;
    const y = baseY + Math.cos(t * 0.5 + phase * 1.3) * ampY;
    const r = 3 + random(`${key}-r`) * 6;
    return { x, y, r, phase };
  });

  // Conexiones por proximidad (O(n²), n<=60 → barato).
  const lines: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const dx = nodes[a].x - nodes[b].x;
      const dy = nodes[a].y - nodes[b].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < maxDist) {
        // Más cerca = más visible; pulso sutil de "dato viajando".
        const proximity = 1 - d / maxDist;
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + (a + b) * 0.5);
        lines.push({ x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y, o: proximity * pulse });
      }
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: rootOpacity,
        overflow: 'hidden',
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {lines.map((l, i) => (
          <line
            key={`l-${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={links}
            strokeWidth={2}
            opacity={l.o * 0.5}
          />
        ))}
        {nodes.map((node, i) => {
          const localPulse = 1 + Math.sin(t * 2 + node.phase) * 0.18;
          return (
            <circle
              key={`n-${i}`}
              cx={node.x}
              cy={node.y}
              r={node.r * localPulse}
              fill={dots}
              style={{ filter: `drop-shadow(0 0 ${node.r}px ${dots})` }}
            />
          );
        })}
      </svg>
    </div>
  );
};

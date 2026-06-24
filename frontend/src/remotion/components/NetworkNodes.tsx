import React from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * NetworkNodes — "red neuronal": nodos que derivan y se conectan por proximidad.
 *
 * - Posiciones generadas de forma determinista (aleatorias pero reproducibles vía
 *   `seed`; cambia `seed` para otra disposición). NO están hardcodeadas.
 * - CONFINABLE a una región con x/y (centro) + width/height → puede ocupar solo
 *   una zona, moverse o estirarse; los nodos se distribuyen dentro de esa caja.
 * - Atómico: nodeCount, connectionDistance, speed, nodeSize, lineWidth, drift.
 * - Las conexiones se recalculan por proximidad cada frame → red viva.
 */
export interface NetworkNodesProps extends UniversalProps {
  nodeColor?: string;
  lineColor?: string;
  /** Número de nodos (3-60). */
  nodeCount?: number;
  /** Distancia (px) bajo la cual dos nodos se conectan. Default ~22% del lado menor. */
  connectionDistance?: number;
  /** Velocidad de la deriva ambiental. */
  speed?: number;
  /** Tamaño base de los nodos (px). */
  nodeSize?: number;
  /** Grosor de las líneas (px). */
  lineWidth?: number;
  /** Amplitud de la deriva (1 = normal, 0 = estático). */
  drift?: number;
  /** Alias usado por la IA (sobrescribe nodeColor). */
  color?: string;
  /** Semilla para variar la disposición de forma determinista. */
  seed?: number;
  /** Opacidad global (universal, la IA la usa para atenuar el fondo). */
  opacity?: number;
}

export const NetworkNodes: React.FC<NetworkNodesProps> = ({
  nodeColor = '#38bdf8',
  lineColor,
  nodeCount = 18,
  connectionDistance,
  speed = 1,
  nodeSize = 6,
  lineWidth = 2,
  drift = 1,
  color,
  seed = 0,
  opacity = 1,
  x,
  y,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width: canvasWidth, height: canvasHeight, fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);
  const t = (adjustedFrame / fps) * speed;

  const dots = color ?? nodeColor;
  const links = lineColor ?? dots;
  const rootOpacity = Math.min(1, Math.max(0, opacity));

  // Región (caja). Por defecto, todo el lienzo.
  const W = typeof width === 'number' ? width : canvasWidth;
  const H = typeof height === 'number' ? height : canvasHeight;
  const posX = typeof x === 'number' ? x : canvasWidth / 2;
  const posY = typeof y === 'number' ? y : canvasHeight / 2;

  const n = Math.min(60, Math.max(3, Math.round(nodeCount)));
  const maxDist = connectionDistance ?? Math.min(W, H) * 0.22;

  // Nodos deterministas con deriva ambiental lenta, dentro de la región.
  const nodes = Array.from({ length: n }).map((_, i) => {
    const key = `nn-${seed}-${i}`;
    const baseX = random(`${key}-x`) * W;
    const baseY = random(`${key}-y`) * H;
    const phase = random(`${key}-p`) * Math.PI * 2;
    const ampX = W * 0.04 * drift;
    const ampY = H * 0.04 * drift;
    const nx = baseX + Math.sin(t * 0.6 + phase) * ampX;
    const ny = baseY + Math.cos(t * 0.5 + phase * 1.3) * ampY;
    const r = nodeSize * (0.6 + random(`${key}-r`) * 0.9);
    return { x: nx, y: ny, r, phase };
  });

  // Conexiones por proximidad (O(n²), n<=60 → barato).
  const lines: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const dx = nodes[a].x - nodes[b].x;
      const dy = nodes[a].y - nodes[b].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < maxDist) {
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
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${W}px`,
        height: `${H}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 0,
        opacity: rootOpacity,
        overflow: 'hidden',
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {lines.map((l, i) => (
          <line
            key={`l-${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={links}
            strokeWidth={lineWidth}
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

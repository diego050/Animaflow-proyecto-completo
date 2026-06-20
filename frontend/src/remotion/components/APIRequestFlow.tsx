import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

type FlowNode = { label?: string; sublabel?: string; body?: string; color?: string };

interface APIRequestFlowProps extends UniversalProps {
  method?: string;
  endpoint?: string;
  responseCode?: number;
  requestBody?: string;
  responseBody?: string;
  /** Cadena de N cajas (sobrescribe el modo request/response por defecto). */
  steps?: FlowNode[];
  /** Cómo aparece: secuencia (caja→flecha→caja), todo de golpe o fade. */
  revealStyle?: 'sequence' | 'instant' | 'fade';
  /** Velocidad de la flecha. */
  arrowSpeed?: number;
}

/**
 * APIRequestFlow — flujo de N cajas conectadas por flechas (request→response o una
 * cadena arbitraria vía `steps`). Atómico: nº de cajas, colores, y estilo de
 * aparición (secuencia / instantáneo / fade). Responsive (useCanvas).
 */
export const APIRequestFlow: React.FC<APIRequestFlowProps> = ({
  method = 'POST',
  endpoint = '/api/v1/generate',
  responseCode = 200,
  requestBody = '{\n  "prompt": "Epic sci-fi scene",\n  "aspect_ratio": "16:9"\n}',
  responseBody = '{\n  "status": "success",\n  "data": {\n    "job_id": "8f92a"\n  }\n}',
  steps,
  revealStyle = 'sequence',
  color = '#3b82f6',
  bgColor = '#1e293b',
  x = 540,
  y = 540,
  delay = 0,
  arrowSpeed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const isSuccess = responseCode >= 200 && responseCode < 300;
  const statusColor = isSuccess ? '#22c55e' : '#ef4444';
  const methodColor = method === 'GET' ? '#38bdf8' : method === 'POST' ? '#22c55e' : method === 'DELETE' ? '#ef4444' : '#f59e0b';

  // Nodos: `steps` si vienen; si no, el par request/response por defecto.
  const nodes: FlowNode[] = (Array.isArray(steps) && steps.length > 0)
    ? steps
    : [
        { label: method, sublabel: endpoint, body: requestBody, color: methodColor },
        { label: String(responseCode), sublabel: isSuccess ? 'OK' : 'ERROR', body: responseBody, color: statusColor },
      ];

  // -- Dimensiones relativas --
  const row = c.isLandscape;
  const boxW = row ? c.vw(26) : c.vw(82);
  const fs = c.vmin(2.4);
  const codeFs = fs * 0.82;
  const pad = c.vmin(1.8);
  const rad = c.vmin(1.5);
  const gap = c.vmin(2.5);
  const arrowLen = row ? c.vw(10) : c.vh(7);
  const arrowThick = c.vmin(0.45);

  const instant = revealStyle === 'instant';
  const fade = revealStyle === 'fade';
  const stagger = 22;

  const nodeReveal = (i: number) => {
    if (instant) return { scale: 1, opacity: 1 };
    if (fade) return { scale: 1, opacity: interpolate(adjustedFrame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }) };
    const start = i * stagger;
    return {
      scale: spring({ frame: Math.max(0, adjustedFrame - start), fps, config: { damping: 13 } }),
      opacity: interpolate(adjustedFrame, [start, start + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    };
  };
  const arrowReveal = (i: number) => {
    if (instant || fade) return 1;
    const start = i * stagger + 12;
    const end = start + 24 / Math.max(0.25, Number(arrowSpeed) || 1);
    return interpolate(adjustedFrame, [start, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  const boxStyle: React.CSSProperties = {
    width: boxW, padding: pad, backgroundColor: bgColor, borderRadius: rad,
    boxShadow: `0 ${c.vmin(2)}px ${c.vmin(4)}px rgba(0,0,0,0.3)`,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', boxSizing: 'border-box',
  };

  const Arrow = (progress: number) => (
    <div style={{ position: 'relative', width: row ? arrowLen : arrowThick * 2, height: row ? arrowThick * 2 : arrowLen }}>
      <div style={{ position: 'absolute', ...(row ? { top: '50%', left: 0, width: '100%', height: arrowThick, transform: 'translateY(-50%)' } : { left: '50%', top: 0, height: '100%', width: arrowThick, transform: 'translateX(-50%)' }), backgroundColor: '#334155', borderRadius: arrowThick }} />
      <div style={{ position: 'absolute', ...(row ? { top: '50%', left: 0, width: `${progress * 100}%`, height: arrowThick, transform: 'translateY(-50%)' } : { left: '50%', top: 0, height: `${progress * 100}%`, width: arrowThick, transform: 'translateX(-50%)' }), backgroundColor: color, borderRadius: arrowThick, boxShadow: `0 0 ${c.vmin(1)}px ${color}` }} />
      <div style={{ position: 'absolute', opacity: progress > 0 ? 1 : 0, ...(row ? { top: '50%', left: `${progress * 100}%`, transform: 'translate(-50%, -50%)', borderTop: `${arrowThick * 2.5}px solid transparent`, borderBottom: `${arrowThick * 2.5}px solid transparent`, borderLeft: `${arrowThick * 4}px solid ${color}` } : { left: '50%', top: `${progress * 100}%`, transform: 'translate(-50%, -50%)', borderLeft: `${arrowThick * 2.5}px solid transparent`, borderRight: `${arrowThick * 2.5}px solid transparent`, borderTop: `${arrowThick * 4}px solid ${color}` }), width: 0, height: 0 }} />
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap, fontFamily: 'Inter, sans-serif', zIndex: 45 }}>
      {nodes.map((node, i) => {
        const rev = nodeReveal(i);
        const nodeColor = node.color || color;
        return (
          <React.Fragment key={i}>
            {i > 0 && Arrow(arrowReveal(i - 1))}
            <div style={{ ...boxStyle, transform: `scale(${rev.scale})`, opacity: rev.opacity, boxShadow: `0 ${c.vmin(2)}px ${c.vmin(4)}px rgba(0,0,0,0.3), 0 0 0 ${c.vmin(0.25)}px ${nodeColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: gap * 0.33, marginBottom: pad * 0.6 }}>
                {node.label ? <div style={{ backgroundColor: nodeColor, color: 'white', padding: `${pad * 0.25}px ${pad * 0.5}px`, borderRadius: rad * 0.5, fontWeight: 'bold', fontSize: fs }}>{node.label}</div> : null}
                {node.sublabel ? <div style={{ color: '#94a3b8', fontSize: fs, fontFamily: 'monospace' }}>{node.sublabel}</div> : null}
              </div>
              {node.body ? (
                <div style={{ backgroundColor: '#0f172a', padding: pad * 0.75, borderRadius: rad * 0.6, width: '100%', boxSizing: 'border-box' }}>
                  <pre style={{ margin: 0, color: '#38bdf8', fontSize: codeFs, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{node.body}</pre>
                </div>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface APIRequestFlowProps extends UniversalProps {
  method?: string;
  endpoint?: string;
  responseCode?: number;
  requestBody?: string;
  responseBody?: string;
  /** Velocidad de la flecha (1 = normal, 2 = el doble de rápida). */
  arrowSpeed?: number;
}

/**
 * APIRequestFlow — COMPONENTE DE REFERENCIA de responsividad (Fase 2).
 *
 * Patrón a replicar en otros componentes (ver `docs/responsive-contract.md`):
 *   1. `const c = useCanvas();` para obtener métricas del lienzo.
 *   2. Tamaños derivados del lienzo con `c.vmin/vw/vh` (NO px absolutos).
 *   3. Layout adaptativo por orientación: `c.isLandscape ? fila : columna`.
 */
export const APIRequestFlow: React.FC<APIRequestFlowProps> = ({
  method = 'POST',
  endpoint = '/api/v1/generate',
  responseCode = 200,
  requestBody = '{\n  "prompt": "Epic sci-fi scene",\n  "aspect_ratio": "16:9"\n}',
  responseBody = '{\n  "status": "success",\n  "data": {\n    "job_id": "8f92a",\n    "eta": "15s"\n  }\n}',
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

  // -- Animación (frame-based, determinista) --------------------------------
  const boxScale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const arrowEnd = 15 + 30 / Math.max(0.25, Number(arrowSpeed) || 1);
  const arrowProgress = interpolate(adjustedFrame, [15, arrowEnd], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const responseOpacity = interpolate(adjustedFrame, [50, 60], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const responseScale = spring({ frame: Math.max(0, adjustedFrame - 50), fps, config: { damping: 12 } });

  const isSuccess = responseCode >= 200 && responseCode < 300;
  const statusColor = isSuccess ? '#22c55e' : '#ef4444';
  const methodColor = method === 'GET' ? '#38bdf8' : method === 'POST' ? '#22c55e' : method === 'DELETE' ? '#ef4444' : '#f59e0b';

  // -- Dimensiones RELATIVAS al lienzo (la convención de Fase 2) -------------
  const row = c.isLandscape;                       // fila en horizontal, columna en vertical
  const boxW = row ? c.vw(28) : c.vw(82);          // las cajas ocupan más ancho en vertical
  const fs = c.vmin(2.4);                          // ~26px en 1080 — escala en todos los formatos
  const codeFs = fs * 0.82;
  const pad = c.vmin(1.8);
  const radius = c.vmin(1.5);
  const gap = c.vmin(3);
  const arrowLen = row ? c.vw(14) : c.vh(8);       // largo del conector según orientación
  const arrowThick = c.vmin(0.45);

  const boxStyle: React.CSSProperties = {
    width: boxW,
    padding: pad,
    backgroundColor: bgColor,
    borderRadius: radius,
    boxShadow: `0 ${c.vmin(2)}px ${c.vmin(4)}px rgba(0,0,0,0.3)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
  };
  const codeBoxStyle: React.CSSProperties = {
    backgroundColor: '#0f172a',
    padding: pad * 0.75,
    borderRadius: radius * 0.6,
    width: '100%',
    boxSizing: 'border-box',
  };
  const tagStyle = (bg: string): React.CSSProperties => ({
    backgroundColor: bg,
    color: 'white',
    padding: `${pad * 0.25}px ${pad * 0.5}px`,
    borderRadius: radius * 0.5,
    fontWeight: 'bold',
    fontSize: fs,
  });

  // Flecha conectora adaptativa: horizontal en fila, vertical en columna.
  const Arrow = (
    <div
      style={{
        position: 'relative',
        opacity: boxScale,
        width: row ? arrowLen : arrowThick * 2,
        height: row ? arrowThick * 2 : arrowLen,
      }}
    >
      {/* riel */}
      <div
        style={{
          position: 'absolute',
          ...(row
            ? { top: '50%', left: 0, width: '100%', height: arrowThick, transform: 'translateY(-50%)' }
            : { left: '50%', top: 0, height: '100%', width: arrowThick, transform: 'translateX(-50%)' }),
          backgroundColor: '#334155',
          borderRadius: arrowThick,
        }}
      />
      {/* progreso animado */}
      <div
        style={{
          position: 'absolute',
          ...(row
            ? { top: '50%', left: 0, width: `${arrowProgress * 100}%`, height: arrowThick, transform: 'translateY(-50%)' }
            : { left: '50%', top: 0, height: `${arrowProgress * 100}%`, width: arrowThick, transform: 'translateX(-50%)' }),
          backgroundColor: color,
          borderRadius: arrowThick,
          boxShadow: `0 0 ${c.vmin(1)}px ${color}`,
        }}
      />
      {/* punta */}
      <div
        style={{
          position: 'absolute',
          opacity: arrowProgress > 0 ? 1 : 0,
          ...(row
            ? {
                top: '50%',
                left: `${arrowProgress * 100}%`,
                transform: 'translate(-50%, -50%)',
                borderTop: `${arrowThick * 2.5}px solid transparent`,
                borderBottom: `${arrowThick * 2.5}px solid transparent`,
                borderLeft: `${arrowThick * 4}px solid ${color}`,
              }
            : {
                left: '50%',
                top: `${arrowProgress * 100}%`,
                transform: 'translate(-50%, -50%)',
                borderLeft: `${arrowThick * 2.5}px solid transparent`,
                borderRight: `${arrowThick * 2.5}px solid transparent`,
                borderTop: `${arrowThick * 4}px solid ${color}`,
              }),
          width: 0,
          height: 0,
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        fontFamily: 'Inter, sans-serif',
        zIndex: 45,
      }}
    >
      {/* Client Box */}
      <div style={{ ...boxStyle, transform: `scale(${boxScale})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: gap * 0.33, marginBottom: pad * 0.6 }}>
          <div style={tagStyle(methodColor)}>{method}</div>
          <div style={{ color: '#94a3b8', fontSize: fs, fontFamily: 'monospace' }}>{endpoint}</div>
        </div>
        <div style={codeBoxStyle}>
          <pre style={{ margin: 0, color: '#38bdf8', fontSize: codeFs, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{requestBody}</pre>
        </div>
      </div>

      {Arrow}

      {/* Server Response Box */}
      <div style={{ ...boxStyle, transform: `scale(${responseScale})`, opacity: responseOpacity, boxShadow: `0 ${c.vmin(2)}px ${c.vmin(4)}px rgba(0,0,0,0.3), 0 0 0 ${c.vmin(0.25)}px ${statusColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: gap * 0.33, marginBottom: pad * 0.6 }}>
          <div style={tagStyle(statusColor)}>{responseCode}</div>
          <div style={{ color: statusColor, fontSize: fs, fontWeight: 'bold' }}>{isSuccess ? 'OK' : 'ERROR'}</div>
        </div>
        <div style={codeBoxStyle}>
          <pre style={{ margin: 0, color: '#22c55e', fontSize: codeFs, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{responseBody}</pre>
        </div>
      </div>
    </div>
  );
};

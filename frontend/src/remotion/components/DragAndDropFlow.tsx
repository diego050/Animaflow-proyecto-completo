/**
 * DragAndDropFlow — A file card drags into a dropzone, drops, then uploads with
 * a progress bar and success check (file upload / drag and drop / import flow).
 *
 * Since video has no pointer, the whole gesture plays on a deterministic
 * timeline driven by useCurrentFrame().
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface DragAndDropFlowProps extends UniversalProps {
  accent?: string;
  dropzoneLabel?: string;
  fileName?: string;
  cardColor?: string;
  textColor?: string;
  mutedColor?: string;
  speed?: number;
  style?: Record<string, unknown>;
}

export const DragAndDropFlow: React.FC<DragAndDropFlowProps> = ({
  x = 0,
  y = 0,
  accent = '#0ea5e9',
  dropzoneLabel = 'Drop file to upload',
  fileName = 'design.fig',
  cardColor = '#18181b',
  textColor = '#fafafa',
  mutedColor = '#71717a',
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  // Timeline phases (in frames).
  const DRAG_END = 40;
  const UPLOAD_START = 52;
  const UPLOAD_END = 110;

  // Drag-in: card travels from offset into the dropzone center.
  const dragP = interpolate(f, [0, DRAG_END], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', });
  const fromX = -c.vmin(28);
  const fromY = -c.vmin(34);
  const cardX = interpolate(dragP, [0, 1], [fromX, 0]);
  const cardY = interpolate(dragP, [0, 1], [fromY, 0]);

  const dropped = f >= DRAG_END;
  const dropPop = dropped
    ? spring({ frame: f - DRAG_END, fps, config: { damping: 10, mass: 0.4 } })
    : 0;
  const cardScale = dropped ? 1 + dropPop * 0.06 - 0.06 : interpolate(dragP, [0, 1], [0.9, 1]);

  const uploadP = interpolate(f, [UPLOAD_START, UPLOAD_END], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const done = uploadP >= 1;
  const active = f >= DRAG_END * 0.6; // dropzone highlights as the card approaches

  const zoneW = c.vmin(46);
  const zoneH = c.vmin(46);
  const cardW = c.vmin(34);
  const fs = c.vmin(3);

  const label = done ? 'Uploaded' : uploadP > 0 ? 'Uploading…' : dropzoneLabel;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Dropzone */}
      <div
        style={{
          position: 'relative',
          width: `${zoneW}px`,
          height: `${zoneH}px`,
          borderRadius: `${radius('lg', c.vmin)}px`,
          border: `${c.vmin(0.4)}px dashed ${active ? accent : mutedColor}`,
          backgroundColor: active ? `${accent}14` : 'rgba(255,255,255,0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${c.vmin(2)}px`,
          transition: 'none',
        }}
      >
        <div style={{ color: active ? accent : mutedColor, fontSize: `${fs * 1.1}px`, fontWeight: 600 }}>{label}</div>

        {/* Upload progress bar */}
        {uploadP > 0 && (
          <div style={{ width: `${zoneW * 0.7}px`, height: `${c.vmin(1.4)}px`, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${uploadP * 100}%`, height: '100%', backgroundColor: accent, borderRadius: '999px' }} />
          </div>
        )}

        {/* File card (drags in, then sits in the zone) */}
        {!done && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${cardX}px), calc(-50% + ${cardY}px)) scale(${cardScale})`,
              width: `${cardW}px`,
              padding: `${c.vmin(2.2)}px`,
              backgroundColor: cardColor,
              borderRadius: `${radius('md', c.vmin)}px`,
              boxShadow: elevation(dropped ? 2 : 3, c.vmin),
              display: 'flex',
              alignItems: 'center',
              gap: `${c.vmin(1.6)}px`,
            }}
          >
            <div style={{ width: `${c.vmin(5)}px`, height: `${c.vmin(6)}px`, borderRadius: `${c.vmin(0.8)}px`, backgroundColor: accent, flexShrink: 0 }} />
            <span style={{ color: textColor, fontSize: `${fs}px`, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</span>
          </div>
        )}

        {/* Success check */}
        {done && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${c.vmin(1.4)}px` }}>
            <div style={{ width: `${c.vmin(8)}px`, height: `${c.vmin(8)}px`, borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: `${c.vmin(4.5)}px`, fontWeight: 700 }}>✓</div>
            <span style={{ color: textColor, fontSize: `${fs * 0.9}px` }}>{fileName}</span>
          </div>
        )}
      </div>
    </div>
  );
};

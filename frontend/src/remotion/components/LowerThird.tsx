import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface LowerThirdProps extends UniversalProps {
  name?: string;
  title?: string;
  /** Color del subtítulo (rol/cargo). */
  titleColor?: string;
  /** Grosor de la barra de acento (px). */
  barWidth?: number;
  /** Ancho máximo del recuadro: el texto hace salto de línea (px). */
  width?: number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name = 'JANE DOE',
  title = 'Chief Technology Officer',
  color = '#2563eb', // Accent bar color
  bgColor = '#ffffff',
  textColor = '#0f172a',
  titleColor = '#64748b',
  barWidth = 12,
  width = 640,
  x = 200,
  y = 800,
  fontSize = 48,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrada: la barra crece, el recuadro se revela con un clip y el texto entra.
  const reveal = interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const barScale = interpolate(adjustedFrame, [10, 20], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  const textOpacity = interpolate(adjustedFrame, [20, 30], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
  const textTranslateX = interpolate(adjustedFrame, [20, 30], [-20, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, display: 'flex', alignItems: 'stretch', fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      {/* Accent Vertical Bar */}
      <div style={{ width: `${barWidth}px`, backgroundColor: color, transform: `scaleY(${barScale})`, transformOrigin: 'bottom', zIndex: 2 }} />

      {/* Main Content Area — se revela con clip horizontal, altura automática */}
      <div style={{
        maxWidth: `${width}px`,
        backgroundColor: bgColor,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '18px 30px',
        borderTopRightRadius: '8px',
        borderBottomRightRadius: '8px',
        boxShadow: '20px 20px 40px rgba(0,0,0,0.3)',
        clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
      }}>
        <div style={{ opacity: textOpacity, transform: `translateX(${textTranslateX}px)` }}>
          <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1.1 }}>
            {name}
          </div>
          <div style={{ fontSize: `${fontSize * 0.5}px`, fontWeight: 500, color: titleColor, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};

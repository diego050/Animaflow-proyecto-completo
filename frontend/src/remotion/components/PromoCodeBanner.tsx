import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface PromoCodeBannerProps extends UniversalProps {
  code?: string;
  discount?: string;
  /** Texto pequeño sobre el código (ej. "Use Code"). Vacío = ocultar. */
  codeLabel?: string;
  /** Color de fondo del panel del descuento. */
  discountBgColor?: string;
  /** Color de fondo del panel del código. */
  codeBgColor?: string;
  /** Color del texto del descuento. */
  discountTextColor?: string;
  /** Color de las líneas punteadas (separador + borde del código). */
  borderColor?: string;
  /** Tamaño del código (px). */
  codeFontSize?: number;
  /** Dirección del banner. */
  direction?: 'horizontal' | 'vertical';
  /** Mostrar el panel del descuento (false = solo el código). */
  showDiscount?: boolean;
  /** Sombra del banner. */
  shadow?: boolean;
  /** Bamboleo de entrada. */
  wiggle?: boolean;
  /** Radio de las esquinas (px). */
  cornerRadius?: number;
}

export const PromoCodeBanner: React.FC<PromoCodeBannerProps> = ({
  code = 'SUMMER50',
  discount = '50% OFF',
  codeLabel = 'Use Code',
  bgColor = '#eab308',
  discountBgColor = '',
  codeBgColor = '',
  textColor = '#0f172a',
  discountTextColor = '',
  color = '#ffffff', // dashed separator (compat)
  borderColor = '',
  x = 540,
  y = 540,
  width,
  fontSize,
  codeFontSize,
  direction = 'horizontal',
  showDiscount = true,
  shadow = true,
  wiggle = true,
  cornerRadius,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 12, stiffness: 200 } });
  const rotate = wiggle ? Math.sin(adjustedFrame * 0.2) * 5 * Math.max(0, 1 - adjustedFrame / 60) : 0;

  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(8);
  const codeFs = codeFontSize && codeFontSize > 0 ? codeFontSize : fs * 0.8;
  const pad = `${c.vmin(5)}px ${c.vmin(7)}px`;
  const dash1 = c.vmin(1.4);
  const dash2 = c.vmin(2.8);
  const rad = cornerRadius && cornerRadius > 0 ? cornerRadius : c.vmin(2.4);
  const sep = borderColor || color;
  const discBg = discountBgColor || bgColor;
  const codeBg = codeBgColor || bgColor;
  const discText = discountTextColor || textColor;
  const isVertical = direction === 'vertical';

  // Separador punteado: vertical entre paneles en fila, horizontal en columna.
  const separator = (
    <div style={isVertical
      ? { height: `${c.vmin(0.6)}px`, background: `repeating-linear-gradient(to right, transparent, transparent ${dash1}px, ${sep} ${dash1}px, ${sep} ${dash2}px)`, backgroundColor: codeBg }
      : { width: `${c.vmin(0.6)}px`, background: `repeating-linear-gradient(to bottom, transparent, transparent ${dash1}px, ${sep} ${dash1}px, ${sep} ${dash2}px)`, backgroundColor: codeBg }} />
  );

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`, display: 'flex', flexDirection: isVertical ? 'column' : 'row', fontFamily: 'Inter, sans-serif', zIndex: 60, boxShadow: shadow ? '0 20px 50px rgba(0,0,0,0.3)' : 'none', borderRadius: `${rad}px`, overflow: 'hidden', maxWidth: width && width > 0 ? `${width}px` : undefined }}>
      {/* Discount panel */}
      {showDiscount && (
        <>
          <div style={{ backgroundColor: discBg, color: discText, padding: pad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${fs}px`, fontWeight: 900, textAlign: 'center' }}>
            {discount}
          </div>
          {separator}
        </>
      )}

      {/* Code panel */}
      <div style={{ backgroundColor: codeBg, color: textColor, padding: pad, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {codeLabel ? (
          <div style={{ fontSize: `${c.vmin(3.2)}px`, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, opacity: 0.7, marginBottom: `${c.vmin(1.4)}px` }}>{codeLabel}</div>
        ) : null}
        <div style={{ border: `${c.vmin(0.6)}px dashed ${sep}`, padding: `${c.vmin(1.4)}px ${c.vmin(4)}px`, borderRadius: `${c.vmin(1.4)}px`, fontSize: `${codeFs}px`, fontWeight: 'bold', fontFamily: 'monospace' }}>
          {code}
        </div>
      </div>
    </div>
  );
};

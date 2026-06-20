import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * GlobalVFX — overlay de "TV ANALÓGICA SIN SEÑAL": nieve/estática (ruido blanco
 * animado), líneas de barrido (scanlines CRT), parpadeo de pantalla y viñeta.
 * Aspecto de canal muerto / VHS / glitch retro.
 *
 * Cubre toda la escena (overlay, no se reposiciona). Determinista: la estática se
 * anima cambiando la `seed` del ruido por frame, sin Math.random.
 */
interface GlobalVFXProps extends UniversalProps {
  /** Intensidad global del efecto (0–1). */
  intensity?: number;
  /** Líneas de barrido CRT. */
  scanlines?: boolean;
  /** Viñeta oscura en los bordes (curvatura de tubo). */
  vignette?: boolean;
  /** Parpadeo de pantalla. */
  flicker?: boolean;
  /** Tinte de color de la estática (canal muerto azulado/gris). */
  tint?: string;
}

export const GlobalVFX: React.FC<GlobalVFXProps> = ({
  intensity = 0.5,
  scanlines = true,
  vignette = true,
  flicker = true,
  tint,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Estática animada: la `seed` cambia por frame → "nieve" de TV sin señal.
  const seed = frame % 100;
  const noiseSvg = `
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>
  `;
  const encodedNoise = `url("data:image/svg+xml;utf8,${encodeURIComponent(noiseSvg)}")`;

  // Parpadeo determinista (caídas ocasionales de brillo).
  const flick = flicker ? 0.85 + 0.15 * Math.sin(frame * 1.7) + (frame % 17 === 0 ? -0.2 : 0) : 1;
  const staticOpacity = Math.max(0, Math.min(1, 0.6 * intensity * flick));

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      {/* Nieve / estática (canal muerto) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: encodedNoise,
          backgroundSize: 'cover',
          opacity: staticOpacity,
          mixBlendMode: 'screen',
        }}
      />

      {/* Tinte opcional (TV apagada azulada/gris) */}
      {tint && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: tint, opacity: 0.12 * intensity, mixBlendMode: 'overlay' }} />
      )}

      {/* Scanlines CRT */}
      {scanlines && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 2px, transparent 4px)',
            opacity: 0.5 * intensity,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* Viñeta / curvatura de tubo */}
      {vignette && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 150px rgba(0,0,0,0.8)',
          }}
        />
      )}
    </div>
  );
};

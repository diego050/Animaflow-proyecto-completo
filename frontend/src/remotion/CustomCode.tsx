import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { compileAnimation } from './compileAnimation';

// Carga Inter para que preview (Player) y render (mp4) usen LA MISMA fuente.
const { fontFamily } = loadFont();

/**
 * Atrapa errores de RUNTIME del componente generado (los que pasan validación pero
 * truenan al renderizar). Sin esto, un error tumbaría el render del video completo.
 */
class RenderErrorBoundary extends React.Component<
  { fallbackBg?: string; fallbackText?: string; fallbackWidth?: number; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error('CustomCode runtime error:', error);
  }
  render() {
    if (this.state.hasError) {
      // Si una escena truena al renderizar, mostramos su texto sobre el fondo
      // (mejor que una pantalla en blanco en el video final).
      const w = this.props.fallbackWidth || 1080;
      return (
        <AbsoluteFill
          style={{
            background: this.props.fallbackBg || '#0a0a0a',
            justifyContent: 'center',
            alignItems: 'center',
            padding: w * 0.09,
          }}
        >
          {this.props.fallbackText ? (
            <div
              style={{
                color: '#ffffff',
                fontFamily,
                fontSize: w * 0.06,
                fontWeight: 800,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {this.props.fallbackText}
            </div>
          ) : null}
        </AbsoluteFill>
      );
    }
    return this.props.children;
  }
}

/**
 * Composición Remotion que renderiza un componente generado por IA (code-gen).
 * Recibe el TSX como prop `code`, lo compila y lo renderiza. La usa el render-server
 * para producir el mp4 (compositionId = "CustomCode").
 */
export const CustomCode: React.FC<{
  code: string;
  durationInFrames?: number;
  width?: number;
  height?: number;
  fallbackText?: string;
  fallbackBg?: string;
}> = ({ code, width, fallbackText, fallbackBg }) => {
  const Comp = useMemo(() => {
    try {
      return compileAnimation(code);
    } catch (e) {
      console.error('CustomCode compile error:', e);
      return null;
    }
  }, [code]);

  if (!Comp) {
    return (
      <AbsoluteFill
        style={{ background: '#0a0a0a', color: '#f87171', justifyContent: 'center', alignItems: 'center', fontSize: 40 }}
      >
        Error compilando la animación
      </AbsoluteFill>
    );
  }
  // Fuente por defecto = Inter (el texto que no especifique fontFamily la hereda).
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <RenderErrorBoundary fallbackText={fallbackText} fallbackBg={fallbackBg} fallbackWidth={width}>
        <Comp />
      </RenderErrorBoundary>
    </AbsoluteFill>
  );
};

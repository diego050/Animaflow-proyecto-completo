import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { compileAnimation } from './compileAnimation';

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
}> = ({ code }) => {
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
  return <Comp />;
};

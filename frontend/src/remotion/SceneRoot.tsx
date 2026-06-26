import React from "react";
import { AbsoluteFill } from "remotion";
import { CustomCode } from './CustomCode';

interface SceneWrapperProps {
  type?: string;
  text: string;
  durationInFrames: number;
  fallbackBg?: string;
  fallbackColor?: string;
  customCode?: string;
}

/**
 * Renderiza UNA escena para el preview. Code-gen → CustomCode; si no hay código, muestra
 * el texto sobre el fondo (las escenas viejas con `anima_composer` ya no se renderizan: el
 * orquestador se retiró, ver _legacy_orchestrator).
 */
export const SceneWrapper: React.FC<SceneWrapperProps> = ({
  text,
  durationInFrames,
  fallbackBg = "#000000",
  fallbackColor = "#ffffff",
  customCode,
}) => {
  if (customCode) {
    return (
      <CustomCode
        code={customCode}
        durationInFrames={durationInFrames}
        fallbackText={text}
        fallbackBg={fallbackBg}
      />
    );
  }
  return (
    <AbsoluteFill
      style={{ backgroundColor: fallbackBg, justifyContent: "center", alignItems: "center" }}
    >
      <div style={{ color: fallbackColor, fontSize: 60, fontWeight: "bold", textAlign: "center", padding: 40 }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

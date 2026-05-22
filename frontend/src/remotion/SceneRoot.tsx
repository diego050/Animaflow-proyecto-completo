import { Composition, registerRoot, Audio } from "remotion";
import React from "react";
import { AbsoluteFill } from "remotion";
import { generatedModules } from "./generated";

interface SceneWrapperProps {
  type: string;
  text: string;
  durationInFrames: number;
  fallbackBg?: string;
  fallbackColor?: string;
  audioUrl?: string;
}

const SceneWrapper: React.FC<SceneWrapperProps> = ({
  type,
  text,
  durationInFrames,
  fallbackBg = "#000000",
  fallbackColor = "#ffffff",
  audioUrl,
}) => {
  const mod = (generatedModules as Record<string, Record<string, unknown>>)[type];
  const Component = mod?.SceneComponent as React.ComponentType<{ text: string; durationInFrames: number }> | undefined;

  if (!Component) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: fallbackBg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: fallbackColor,
            fontSize: 60,
            fontWeight: "bold",
            textAlign: "center",
            padding: 40,
          }}
        >
          {text}
        </div>
        {audioUrl && <Audio src={audioUrl} />}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <Component text={text} durationInFrames={durationInFrames} />
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};

export const RemotionSceneRoot = () => {
  return (
    <Composition
      id="SceneRenderer"
      component={SceneWrapper as React.FC<any>}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={150} // Fallback de 5 segundos
      calculateMetadata={({ props }) => {
        const typedProps = props as unknown as SceneWrapperProps;
        return {
          durationInFrames: typedProps.durationInFrames || 150,
        };
      }}
      defaultProps={{
        type: "",
        text: "",
        durationInFrames: 150,
        fallbackBg: "#000000",
        fallbackColor: "#ffffff",
      }}
    />
  );
};

registerRoot(RemotionSceneRoot);

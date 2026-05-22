import { Composition, registerRoot } from "remotion";
import React from "react";
import { AbsoluteFill } from "remotion";
import { generatedModules } from "./generated";

interface SceneWrapperProps {
  type: string;
  text: string;
  durationInFrames: number;
  fallbackBg?: string;
  fallbackColor?: string;
}

const SceneWrapper: React.FC<SceneWrapperProps> = ({
  type,
  text,
  durationInFrames,
  fallbackBg = "#000000",
  fallbackColor = "#ffffff",
}) => {
  const mod = (generatedModules as Record<string, any>)[type];
  const Component = mod?.SceneComponent;

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
      </AbsoluteFill>
    );
  }

  return <Component text={text} durationInFrames={durationInFrames} />;
};

export const RemotionSceneRoot = () => {
  return (
    <Composition
      id="SceneRenderer"
      component={SceneWrapper}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={1}
      defaultProps={{
        type: "",
        text: "",
        durationInFrames: 1,
        fallbackBg: "#000000",
        fallbackColor: "#ffffff",
      }}
    />
  );
};

registerRoot(RemotionSceneRoot);

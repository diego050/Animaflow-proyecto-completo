import { Composition, registerRoot } from "remotion";
import React from "react";
import { AbsoluteFill } from "remotion";
import { generatedModules } from "./generated";
import { AnimaComposer } from './composer/AnimaComposer';
import { COMPONENT_REGISTRY } from './registry';

interface SceneWrapperProps {
  type: string;
  text: string;
  durationInFrames: number;
  fallbackBg?: string;
  fallbackColor?: string;
  animaComposer?: any;
}

export const SceneWrapper: React.FC<SceneWrapperProps> = ({
  type,
  text,
  durationInFrames,
  fallbackBg = "#000000",
  fallbackColor = "#ffffff",
  animaComposer,
}) => {
  if (type === 'custom' && animaComposer) {
    return (
      <AnimaComposer
        spec={animaComposer}
        text={text}
        durationInFrames={durationInFrames}
      />
    );
  }

  const mod = (generatedModules as Record<string, Record<string, unknown>>)[type];
  let Component = mod?.SceneComponent as React.ComponentType<{ text: string; durationInFrames: number }> | undefined;

  if (!Component && COMPONENT_REGISTRY[type]) {
    Component = COMPONENT_REGISTRY[type] as React.ComponentType<{ text: string; durationInFrames: number }>;
  }

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

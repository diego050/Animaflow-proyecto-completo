import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React from "react";
import type { TimelineSpec } from "../types/spec";

interface FallbackSceneProps {
  text: string;
  fallbackBg: string;
  fallbackColor: string;
  isLoading: boolean;
}

const FallbackScene = ({ text, fallbackBg, fallbackColor, isLoading }: FallbackSceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 1 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: fallbackBg, justifyContent: "center", alignItems: "center" }}>
       <div style={{ opacity, color: fallbackColor, fontSize: 80, fontWeight: "bold", fontFamily: "sans-serif", textAlign: "center", padding: 40, zIndex: 10 }}>
        {text}
      </div>
      {isLoading ? <div style={{position: "absolute", bottom: 20, color: "yellow", fontSize: 20}}>Cargando IA...</div> : null}
    </AbsoluteFill>
  );
};

interface DynamicSceneProps {
  type: string;
  text: string;
  durationInFrames: number;
  fallbackBg: string;
  fallbackColor: string;
}

interface SceneProps {
  text: string;
  durationInFrames: number;
  [key: string]: unknown;
}

type SceneComponent = React.ComponentType<SceneProps>;

// Mapa estático de componentes de escena conocidos.
// A medida que se generen/validen nuevos tipos de escena, añadirlos aquí.
const sceneComponents: Record<string, SceneComponent> = {
  // Ejemplos: 'FadeText': FadeTextScene, 'Typewriter': TypewriterScene,
};

const DynamicScene = ({ type, text, durationInFrames, fallbackBg, fallbackColor }: DynamicSceneProps) => {
  const Component = sceneComponents[type];

  if (!Component) {
    return (
      <FallbackScene
        text={text}
        fallbackBg={fallbackBg}
        fallbackColor={fallbackColor}
        isLoading={false}
      />
    );
  }

  return <Component text={text} durationInFrames={durationInFrames} />;
};

export const MainComposition = ({ spec }: { spec: TimelineSpec }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {spec.scenes.map((scene, index) => {
        const fromFrame = Math.round(scene.start_time_seconds * fps);
        const durationInFrames = Math.max(1, Math.round(scene.duration_seconds * fps));

        return (
          <Sequence key={index} from={fromFrame} durationInFrames={durationInFrames}>
            <DynamicScene
               type={scene.type}
               text={scene.text}
               durationInFrames={durationInFrames}
               fallbackBg={scene.remotion_props?.backgroundColor || "#000"}
               fallbackColor={scene.remotion_props?.textColor || "#fff"}
            />
            {scene.audio_url && <Audio src={scene.audio_url} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

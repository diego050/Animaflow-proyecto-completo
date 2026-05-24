import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React from "react";
import type { TimelineSpec } from "../types/spec";
import { useAuthStore } from "../store/useAuthStore";
import { generatedModules } from "./generated"; // index.ts global re-exporta todo
import { AnimaComposer } from './composer/AnimaComposer';
import { COMPONENT_REGISTRY } from './registry';

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
  animaComposer?: any;
}

interface SceneProps {
  text: string;
  durationInFrames: number;
  [key: string]: unknown;
}
type SceneComponent = React.ComponentType<SceneProps>;

// Mapa dinámico poblado por el index.ts global que re-exporta
// todos los componentes generados de todos los usuarios.
const sceneComponents: Record<string, SceneComponent> = {};

// Cada módulo en generatedModules es un namespace import (* as X).
// El componente real exportado por cada archivo TSX es 'SceneComponent'.
for (const [typeName, mod] of Object.entries(generatedModules)) {
  const moduleObj = mod as Record<string, unknown>;
  if (moduleObj && moduleObj.SceneComponent) {
    sceneComponents[typeName] = moduleObj.SceneComponent as SceneComponent;
  }
}

const DynamicScene = ({ type, text, durationInFrames, fallbackBg, fallbackColor, animaComposer }: DynamicSceneProps) => {
  if (type === 'custom' && animaComposer) {
    return (
      <AnimaComposer
        spec={animaComposer}
        text={text}
        durationInFrames={durationInFrames}
      />
    );
  }

  let Component = sceneComponents[type];
  let isStandardLibrary = false;

  if (!Component && COMPONENT_REGISTRY[type]) {
    Component = COMPONENT_REGISTRY[type] as SceneComponent;
    isStandardLibrary = true;
  }

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

  if (isStandardLibrary) {
    return (
      <AbsoluteFill style={{ backgroundColor: fallbackBg, overflow: 'hidden' }}>
        <Component text={text} durationInFrames={durationInFrames} color={fallbackColor} textColor={fallbackColor} bgColor={fallbackBg} />
      </AbsoluteFill>
    );
  }

  return <Component text={text} durationInFrames={durationInFrames} />;
};

export const MainComposition = ({ spec }: { spec: TimelineSpec }) => {
  const { fps } = useVideoConfig();
  const token = useAuthStore.getState().token;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {spec.scenes.map((scene, index) => {
        const fromFrame = Math.round(scene.start_time_seconds * fps);
        const durationInFrames = Math.max(1, Math.round(scene.duration_seconds * fps));
        const audioUrlWithToken = scene.audio_url && token
          ? `${scene.audio_url}?token=${token}`
          : scene.audio_url;

        return (
          <Sequence key={index} from={fromFrame} durationInFrames={durationInFrames}>
            <DynamicScene
               type={scene.type}
               text={scene.text}
               durationInFrames={durationInFrames}
                fallbackBg={String(scene.remotion_props?.backgroundColor || "#000")}
                fallbackColor={String(scene.remotion_props?.textColor || "#fff")}
                animaComposer={(scene as any).animaComposer}
            />
            {audioUrlWithToken && <Audio src={audioUrlWithToken} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

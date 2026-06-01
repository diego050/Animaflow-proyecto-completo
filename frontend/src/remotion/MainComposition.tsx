import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React from "react";
import type { TimelineSpec, Spec } from "../types/spec";
import { useAuthStore } from "../store/useAuthStore";
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
  animaComposer?: Spec['anima_composer'];
  nextSceneBackgroundColors?: string[];
}

interface SceneProps {
  text: string;
  durationInFrames: number;
  [key: string]: unknown;
}
type SceneComponent = React.ComponentType<SceneProps>;

const DynamicScene = ({ type, text, durationInFrames, fallbackBg, fallbackColor, animaComposer, nextSceneBackgroundColors }: DynamicSceneProps) => {
  if (type === 'custom' && animaComposer) {
    return (
      <AnimaComposer
        spec={animaComposer}
        text={text}
        durationInFrames={durationInFrames}
        nextSceneBackgroundColors={nextSceneBackgroundColors}
      />
    );
  }

  let Component = COMPONENT_REGISTRY[type] as SceneComponent | undefined;

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

  return (
    <AbsoluteFill style={{ backgroundColor: fallbackBg, overflow: 'hidden' }}>
      <Component text={text} durationInFrames={durationInFrames} color={fallbackColor} textColor={fallbackColor} bgColor={fallbackBg} />
    </AbsoluteFill>
  );
};

export const MainComposition = ({ spec }: { spec: TimelineSpec }) => {
  const { fps } = useVideoConfig();
  const token = useAuthStore.getState().token;

  // Pre-calculate cumulative frame offsets (scenes are contiguous, no gaps)
  // Transitions are handled internally via exit animations + background crossfade.
  let cumulativeFrame = 0;
  const sceneOffsets: number[] = [];
  const nextSceneColors: (string[] | undefined)[] = [];

  for (let i = 0; i < spec.scenes.length; i++) {
    const scene = spec.scenes[i];
    const durationInFrames = Math.max(1, Math.round(scene.duration_seconds * fps));

    sceneOffsets.push(cumulativeFrame);
    cumulativeFrame += durationInFrames;

    // Store next scene's background colors for crossfade
    const nextScene = spec.scenes[i + 1];
    if (nextScene?.anima_composer?.background?.colors) {
      nextSceneColors.push(nextScene.anima_composer.background.colors);
    } else if (nextScene?.remotion_props?.backgroundColor) {
      nextSceneColors.push([nextScene.remotion_props.backgroundColor as string]);
    } else {
      nextSceneColors.push(undefined);
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {spec.scenes.map((scene, index) => {
        const fromFrame = sceneOffsets[index];
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
                animaComposer={scene.anima_composer}
                nextSceneBackgroundColors={nextSceneColors[index]}
            />
            {audioUrlWithToken && <Audio src={audioUrlWithToken} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

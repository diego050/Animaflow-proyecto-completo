import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React from "react";
import type { TimelineSpec, Spec } from "../types/spec";
import { useAuthStore } from "../store/useAuthStore";
import { AnimaComposer } from './composer/AnimaComposer';
import { COMPONENT_REGISTRY } from './registry';
import { TransitionWrapper } from './transitions/TransitionWrapper';

// C2 (v7.5): transición de escena por defecto. GradientOverlay es SIMÉTRICO
// (opacidad sin(progress·π): claro→pico→claro), así que como overlay centrado en
// el corte hace un "barrido" de color limpio sin dejar la pantalla en negro.
// Es puramente visual y aditivo: no altera el audio ni el secuenciado de escenas.
const SCENE_TRANSITION_TYPE = 'GradientOverlay';
const SCENE_TRANSITION_FRAMES = 16; // ~0.5s a 30fps

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
  wordTimestamps?: { word: string; start: number; end: number }[];
}

interface SceneProps {
  text: string;
  durationInFrames: number;
  [key: string]: unknown;
}
type SceneComponent = React.ComponentType<SceneProps>;

const DynamicScene = ({ type, text, durationInFrames, fallbackBg, fallbackColor, animaComposer, nextSceneBackgroundColors, wordTimestamps }: DynamicSceneProps) => {
  if (type === 'custom' && animaComposer) {
    return (
      <AnimaComposer
        spec={animaComposer}
        text={text}
        durationInFrames={durationInFrames}
        nextSceneBackgroundColors={nextSceneBackgroundColors}
        wordTimestamps={wordTimestamps}
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

        // v7.3: timestamps por palabra relativos al inicio de la escena
        // (los del backend son globales, offset por start_time_seconds).
        const relativeWordTimestamps = (scene.word_timestamps ?? []).map((w) => ({
          word: w.word,
          start: Math.max(0, w.start - scene.start_time_seconds),
          end: Math.max(0, w.end - scene.start_time_seconds),
        }));

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
                wordTimestamps={relativeWordTimestamps}
            />
            {audioUrlWithToken && <Audio src={audioUrlWithToken} />}
          </Sequence>
        );
      })}

      {/* C2: overlays de transición, CENTRADOS en cada corte entre escenas.
          Van después de las escenas en el DOM → se pintan ENCIMA. No tienen
          audio ni alteran el timing; solo es un efecto visual sobre el corte. */}
      {spec.scenes.slice(1).map((_, i) => {
        const boundaryFrame = sceneOffsets[i + 1];
        const from = Math.max(0, boundaryFrame - Math.floor(SCENE_TRANSITION_FRAMES / 2));
        return (
          <Sequence
            key={`transition-${i}`}
            from={from}
            durationInFrames={SCENE_TRANSITION_FRAMES}
          >
            <TransitionWrapper
              type={SCENE_TRANSITION_TYPE}
              durationFrames={SCENE_TRANSITION_FRAMES}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

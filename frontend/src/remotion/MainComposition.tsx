import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React from "react";
import type { TimelineSpec, Spec } from "../types/spec";
import { useAuthStore } from "../store/useAuthStore";
import { AnimaComposer } from './composer/AnimaComposer';
import { COMPONENT_REGISTRY } from './registry';
import { TransitionWrapper } from './transitions/TransitionWrapper';

// v8 (Fase 5): transiciones limpias (neutrales: negro/blanco, sin colores raros).
// Se eligen por CONTINUIDAD entre escenas (no rotación ciega por índice):
//  - Cambio de fondo grande  → FadeThroughBlack (velo neutro que cubre el salto).
//  - Escena entrante corta/punchy → ZoomBlurTransition (enérgica, mantiene ritmo).
//  - Escenas continuas (look similar) → WipeTransition (barrido direccional suave).
const SCENE_TRANSITION_FRAMES = 18; // ~0.6s a 30fps

type SceneLike = TimelineSpec['scenes'][number];

/** Primer color de fondo representativo de la escena (anima_composer o remotion_props). */
function sceneBgColor(scene: SceneLike | undefined): string | undefined {
  const cols = scene?.anima_composer?.background?.colors;
  if (Array.isArray(cols) && cols.length > 0) return cols[0];
  return scene?.remotion_props?.backgroundColor as string | undefined;
}

function parseRgb(color: string | undefined): [number, number, number] | null {
  if (!color) return null;
  const s = color.trim();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
    if (h.length >= 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if (![r, g, b].some(Number.isNaN)) return [r, g, b];
    }
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(',').map((v) => parseFloat(v));
    if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v))) return [p[0], p[1], p[2]];
  }
  return null;
}

/** Distancia euclidiana RGB (0–441). Desconocido → grande (cubrir por seguridad). */
function bgColorDistance(a: SceneLike | undefined, b: SceneLike | undefined): number {
  const ca = parseRgb(sceneBgColor(a));
  const cb = parseRgb(sceneBgColor(b));
  if (!ca || !cb) return 441;
  return Math.sqrt((ca[0] - cb[0]) ** 2 + (ca[1] - cb[1]) ** 2 + (ca[2] - cb[2]) ** 2);
}

/** Transición determinista según la continuidad entre dos escenas consecutivas. */
function pickSceneTransition(prev: SceneLike | undefined, next: SceneLike | undefined): string {
  const dist = bgColorDistance(prev, next);
  if (dist > 120) return 'FadeThroughBlack'; // cambio visual fuerte → cubrir con negro
  const nextDur = next?.duration_seconds ?? 3;
  if (nextDur < 2.5) return 'ZoomBlurTransition'; // escena corta/punchy → enérgica
  return 'WipeTransition'; // continuas → barrido suave
}

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
        // Continuidad: el corte está entre la escena i (saliente) y la i+1 (entrante).
        const transitionType = pickSceneTransition(spec.scenes[i], spec.scenes[i + 1]);
        return (
          <Sequence
            key={`transition-${i}`}
            from={from}
            durationInFrames={SCENE_TRANSITION_FRAMES}
          >
            <TransitionWrapper
              type={transitionType}
              durationFrames={SCENE_TRANSITION_FRAMES}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

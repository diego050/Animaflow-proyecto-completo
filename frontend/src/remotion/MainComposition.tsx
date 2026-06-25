import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React from "react";
import type { TimelineSpec, Spec } from "../types/spec";
import { useAuthStore } from "../store/useAuthStore";
import { AnimaComposer } from './composer/AnimaComposer';
import { CustomCode } from './CustomCode';
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

const VALID_TRANSITIONS = new Set([
  'FadeThroughBlack', 'ZoomBlurTransition', 'WipeTransition',
  'GlitchTransition', 'LightLeakTransition', 'GradientOverlay',
  'ZoomThroughTransition', 'SpatialPush', 'FrostedGlassWipe',
  'GridPixelateWipe', 'ChromaticAberrationWipe', 'WhipPanTransition',
  'SlideWipe', 'CrossDissolve', 'MorphTransition', 'IrisTransition',
]);

/** Transición determinista según la continuidad entre dos escenas consecutivas.
 *  `index` aporta variedad determinista entre las opciones "continuas" → así se
 *  usan los 5 tipos a lo largo del video (antes solo 3). */
function pickSceneTransition(prev: SceneLike | undefined, next: SceneLike | undefined, index = 0): string {
  const dist = bgColorDistance(prev, next);
  if (dist > 120) return 'FadeThroughBlack'; // cambio visual fuerte → cubrir con velo
  const nextDur = next?.duration_seconds ?? 3;
  if (nextDur < 2.5) return 'ZoomBlurTransition'; // escena corta/punchy → enérgica
  // continuas (look similar): variar de forma determinista entre suaves/estilizadas.
  const variety = ['WipeTransition', 'LightLeakTransition', 'GlitchTransition'];
  return variety[index % variety.length];
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
  customCode?: string;
  nextSceneBackgroundColors?: string[];
  wordTimestamps?: { word: string; start: number; end: number }[];
}

interface SceneProps {
  text: string;
  durationInFrames: number;
  [key: string]: unknown;
}
type SceneComponent = React.ComponentType<SceneProps>;

const DynamicScene = ({ type, text, durationInFrames, fallbackBg, fallbackColor, animaComposer, customCode, nextSceneBackgroundColors, wordTimestamps }: DynamicSceneProps) => {
  // Fase 3: escena generada por code-gen (la IA escribió el componente).
  if (customCode) {
    return <CustomCode code={customCode} durationInFrames={durationInFrames} />;
  }
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

// CrossDissolveOut — renderiza la escena SALIENTE alineada a su propio timeline
// (sin reiniciar animaciones) y la desvanece (opacidad 1→0) durante la ventana de
// transición, ENCIMA de la escena entrante real. Logra transiciones reales de 2
// escenas (las únicas que no pueden ser un velo):
//   - CrossDissolve  → zoomTo = 1 (solo fundido).
//   - ZoomThrough    → zoomTo > 1 (la escena saliente hace zoom-in mientras se
//     funde, "atravesando" hacia la entrante).
// Sin audio: el audio lo reproducen las escenas reales de abajo.
const CrossDissolveOut: React.FC<DynamicSceneProps & {
  holdFrames: number;
  fadeFrames: number;
  zoomTo?: number;
  /** Desplazamiento final en % (push). */
  slideXTo?: number;
  slideYTo?: number;
  /** Si false, no se desvanece (p.ej. push: se desliza fuera, opaco). */
  fade?: boolean;
}> = ({
  holdFrames,
  fadeFrames,
  zoomTo = 1,
  slideXTo = 0,
  slideYTo = 0,
  fade = true,
  ...sceneProps
}) => {
  const f = useCurrentFrame();
  const range: [number, number] = [holdFrames, holdFrames + fadeFrames];
  const clampOpts = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const opacity = fade ? interpolate(f, range, [1, 0], clampOpts) : 1;
  const scale = interpolate(f, range, [1, zoomTo], clampOpts);
  const tx = interpolate(f, range, [0, slideXTo], clampOpts);
  const ty = interpolate(f, range, [0, slideYTo], clampOpts);
  return (
    <AbsoluteFill style={{ opacity, transform: `translate(${tx}%, ${ty}%) scale(${scale})` }}>
      <DynamicScene {...sceneProps} />
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
                customCode={(scene as { custom_code?: string }).custom_code}
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
        // Continuidad: el corte está entre la escena i (saliente) y la i+1 (entrante).
        // Override de la IA: la escena saliente puede fijar `transition`/`transition_color`.
        const outgoing = spec.scenes[i];
        // Override de la IA: en el spec a nivel escena (transition) o dentro del
        // anima_composer (donde lo emite el LLM). Si no, se elige automáticamente.
        const override = outgoing?.transition ?? outgoing?.anima_composer?.transition;
        const overrideColor = outgoing?.transition_color ?? outgoing?.anima_composer?.transition_color;
        const transitionParams = outgoing?.transition_params ?? outgoing?.anima_composer?.transition_params;
        const transitionType = override && VALID_TRANSITIONS.has(override)
          ? override
          : pickSceneTransition(outgoing, spec.scenes[i + 1], i);

        // Duración de la transición: la decide el usuario por corte vía
        // `transition_params.durationFrames`; si no, el default global (~0.6s).
        const tFrames = typeof transitionParams?.durationFrames === 'number' && transitionParams.durationFrames > 0
          ? Math.round(transitionParams.durationFrames as number)
          : SCENE_TRANSITION_FRAMES;
        const from = Math.max(0, boundaryFrame - Math.floor(tFrames / 2));

        // Transiciones de 2 escenas reales (NO velos): renderizan la escena SALIENTE
        // (alineada a su timeline real) ENCIMA de la entrante real.
        //  - CrossDissolve → solo fundido (zoomTo = 1)
        //  - ZoomThrough   → zoom-in de la saliente (targetScale, default 2.5)
        //  - Morph         → zoom-out de la saliente (scaleTo, default 0.5)
        //  - SpatialPush   → la saliente se desliza fuera (direction), sin fundir
        if (
          transitionType === 'CrossDissolve' ||
          transitionType === 'ZoomThroughTransition' ||
          transitionType === 'MorphTransition' ||
          transitionType === 'SpatialPush'
        ) {
          let zoomTo = 1;
          let slideXTo = 0;
          let slideYTo = 0;
          let fade = true;
          if (transitionType === 'ZoomThroughTransition') {
            zoomTo = typeof transitionParams?.targetScale === 'number' ? transitionParams.targetScale : 2.5;
          } else if (transitionType === 'MorphTransition') {
            zoomTo = typeof transitionParams?.scaleTo === 'number' ? transitionParams.scaleTo : 0.5;
          } else if (transitionType === 'SpatialPush') {
            fade = false;
            const dir = typeof transitionParams?.direction === 'string' ? transitionParams.direction : 'left';
            if (dir === 'right') slideXTo = 100;
            else if (dir === 'up') slideYTo = -100;
            else if (dir === 'down') slideYTo = 100;
            else slideXTo = -100; // 'left' (default)
          }
          const outScene = spec.scenes[i];
          const outFrom = sceneOffsets[i];
          const outDur = Math.max(1, Math.round(outScene.duration_seconds * fps));
          const outRelWordTimestamps = (outScene.word_timestamps ?? []).map((w) => ({
            word: w.word,
            start: Math.max(0, w.start - outScene.start_time_seconds),
            end: Math.max(0, w.end - outScene.start_time_seconds),
          }));
          return (
            <Sequence
              key={`transition-${i}`}
              from={outFrom}
              durationInFrames={outDur + tFrames}
            >
              <CrossDissolveOut
                holdFrames={outDur}
                fadeFrames={tFrames}
                zoomTo={zoomTo}
                slideXTo={slideXTo}
                slideYTo={slideYTo}
                fade={fade}
                type={outScene.type}
                text={outScene.text}
                durationInFrames={outDur}
                fallbackBg={String(outScene.remotion_props?.backgroundColor || '#000')}
                fallbackColor={String(outScene.remotion_props?.textColor || '#fff')}
                animaComposer={outScene.anima_composer}
                nextSceneBackgroundColors={nextSceneColors[i]}
                wordTimestamps={outRelWordTimestamps}
              />
            </Sequence>
          );
        }

        return (
          <Sequence
            key={`transition-${i}`}
            from={from}
            durationInFrames={tFrames}
          >
            <TransitionWrapper
              type={transitionType}
              durationFrames={tFrames}
              color={overrideColor}
              params={transitionParams}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

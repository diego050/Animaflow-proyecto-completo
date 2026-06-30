import { Composition, registerRoot } from "remotion";
import { MainComposition } from "./MainComposition";
import { CustomCode } from "./CustomCode";
import { CustomCodeAudio } from "./CustomCodeAudio";
import { dimsFor } from "./aspectDims";
import type { TimelineSpec } from "../types/spec";

const defaultSpec: TimelineSpec = {
  scenes: [
    {
      start_time_seconds: 0,
      duration_seconds: 5,
      text: "Bienvenido a AnimaFlow",
      type: "Fade Text",
      media_query: "Texto blanco con fondo oscuro",
      remotion_props: {
        backgroundColor: "#1a1a1a",
        textColor: "#ffffff"
      },
      sfx: [],
      audio_url: null,
      word_timestamps: null
    }
  ],
  aspect_ratio: "9:16"
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="AnimaFlow-Main"
        component={MainComposition}
        calculateMetadata={({ props }) => {
          const spec = props.spec as TimelineSpec;
          const totalDurationSecs = spec.scenes.reduce((acc, s) => acc + s.duration_seconds, 0);
          const ar = spec.aspect_ratio || "9:16";
          const dims = dimsFor(ar);
          return {
            durationInFrames: Math.max(1, Math.round(totalDurationSecs * 30)),
            props,
            width: dims.w,
            height: dims.h,
          };
        }}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ spec: defaultSpec }}
      />

      {/* Animaciones generadas por IA (code-gen). El componente llega como string `code`. */}
      <Composition
        id="CustomCode"
        component={CustomCode}
        calculateMetadata={({ props }) => {
          const p = props as { durationInFrames?: number; width?: number; height?: number; fps?: number };
          return {
            durationInFrames: Math.max(1, Math.round(p.durationInFrames || 180)),
            fps: p.fps || 30,
            props,
            width: p.width || 1080,
            height: p.height || 1920,
          };
        }}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ code: "", durationInFrames: 180, width: 1080, height: 1920, fps: 30 }}
      />

      {/* Igual que CustomCode pero con audio — para el footage AE por escena (.mov con voz). */}
      <Composition
        id="CustomCodeAudio"
        component={CustomCodeAudio}
        calculateMetadata={({ props }) => {
          const p = props as { durationInFrames?: number; width?: number; height?: number; fps?: number };
          return {
            durationInFrames: Math.max(1, Math.round(p.durationInFrames || 180)),
            fps: p.fps || 30,
            props,
            width: p.width || 1080,
            height: p.height || 1920,
          };
        }}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ code: "", audioSrc: "", durationInFrames: 180, width: 1080, height: 1920, fps: 30 }}
      />
    </>
  );
};

registerRoot(RemotionRoot);

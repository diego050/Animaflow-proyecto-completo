import { Composition, registerRoot } from "remotion";
import { MainComposition } from "./MainComposition";
import { CustomCode } from "./CustomCode";
import type { TimelineSpec } from "../types/spec";

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "4:5": { w: 1080, h: 1350 },
  "3:4": { w: 1080, h: 1440 },
  "1:1": { w: 1080, h: 1080 },
  "16:9": { w: 1920, h: 1080 },
};

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
          const dims = ASPECT_DIMS[ar] || ASPECT_DIMS["9:16"];
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
          const p = props as { durationInFrames?: number; width?: number; height?: number };
          return {
            durationInFrames: Math.max(1, Math.round(p.durationInFrames || 180)),
            props,
            width: p.width || 1080,
            height: p.height || 1920,
          };
        }}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ code: "", durationInFrames: 180, width: 1080, height: 1920 }}
      />
    </>
  );
};

registerRoot(RemotionRoot);

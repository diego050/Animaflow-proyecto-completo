import { Player } from "@remotion/player";
import { MainComposition } from "../remotion/MainComposition";
import { AnimaComposer } from "../remotion/composer/AnimaComposer";
import type { TimelineSpec, Spec } from "../types/spec";

const ASPECT_DIMS: Record<string, { w: number; h: number; ratio: string }> = {
  "9:16": { w: 1080, h: 1920, ratio: "9/16" },
  "4:5": { w: 1080, h: 1350, ratio: "4/5" },
  "3:4": { w: 1080, h: 1440, ratio: "3/4" },
  "1:1": { w: 1080, h: 1080, ratio: "1/1" },
  "16:9": { w: 1920, h: 1080, ratio: "16/9" },
};

interface PreviewPlayerProps {
  spec: TimelineSpec;
  aspectRatio?: string;
  focusSceneIndex?: number | null;
  videoUrl?: string;
}

export const PreviewPlayer = ({ spec, aspectRatio = "9:16", focusSceneIndex, videoUrl }: PreviewPlayerProps) => {
  if (!spec || !spec.scenes) return <div className="text-red-500 font-bold p-8 border border-red-500 rounded-lg">Error: No se recibió un spec válido.</div>;

  const dims = ASPECT_DIMS[aspectRatio] || ASPECT_DIMS["9:16"];
  const totalDuration = spec.scenes.reduce((acc, scene) => acc + (scene.duration_seconds || 0), 0) || 1;
  const durationInFrames = Math.max(1, Math.round(totalDuration * 30));

  const focusedScene = focusSceneIndex != null ? spec.scenes[focusSceneIndex] : null;
  const isCustomScene = focusedScene?.type === 'custom' && (focusedScene as Spec)?.animaComposer;

  return (
    <div 
      className="flex justify-center items-center rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black w-full" 
      style={{ maxWidth: "350px", minHeight: "500px", aspectRatio: dims.ratio }}
    >
      {focusSceneIndex != null ? (
        /* ── Individual scene preview ── */
        isCustomScene ? (
          <Player
            component={AnimaComposer}
            inputProps={{
              spec: (focusedScene as Spec).animaComposer!,
              text: focusedScene.text,
              durationInFrames: Math.round((focusedScene.duration_seconds || 5) * 30),
            }}
            durationInFrames={Math.round((focusedScene.duration_seconds || 5) * 30)}
            compositionWidth={dims.w}
            compositionHeight={dims.h}
            fps={30}
            controls
            style={{ width: '100%', height: '100%' }}
          />
        ) : videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain bg-black"
            controlsList="nodownload"
          />
        ) : (
          <div className="text-center p-6 text-white/60">
            <p className="text-sm">
              Selecciona una escena de la lista para ver su preview.
            </p>
            <p className="text-xs mt-2 text-white/40">
              El video final estará disponible aquí una vez renderizado.
            </p>
          </div>
        )
      ) : (
        /* ── Full timeline preview (current behavior) ── */
        <Player
          component={MainComposition}
          inputProps={{ spec }}
          durationInFrames={durationInFrames}
          compositionWidth={dims.w}
          compositionHeight={dims.h}
          fps={30}
          style={{
            width: "100%",
            height: "100%",
          }}
          controls
        />
      )}
    </div>
  );
};

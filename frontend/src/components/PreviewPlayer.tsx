import { Player } from "@remotion/player";
import { MainComposition } from "../remotion/MainComposition";
import type { TimelineSpec } from "../types/spec";

interface PreviewPlayerProps {
  spec: TimelineSpec;
}

export const PreviewPlayer = ({ spec }: PreviewPlayerProps) => {
  if (!spec || !spec.scenes) return <div className="text-red-500 font-bold p-8 border border-red-500 rounded-lg">Error: No se recibió un spec válido.</div>;

  const totalDuration = spec.scenes.reduce((acc, scene) => acc + (scene.duration_seconds || 0), 0) || 1;
  const durationInFrames = Math.max(1, Math.round(totalDuration * 30));

  return (
    <div 
      className="flex justify-center items-center rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black w-full" 
      style={{ maxWidth: "350px", minHeight: "500px", aspectRatio: "9/16" }}
    >
      <Player
        component={MainComposition}
        inputProps={{ spec }}
        durationInFrames={durationInFrames}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        style={{
          width: "100%",
          height: "100%",
        }}
        controls
      />
    </div>
  );
};

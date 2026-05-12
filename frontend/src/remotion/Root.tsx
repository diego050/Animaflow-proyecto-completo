import { Composition, registerRoot } from "remotion";
import { MainComposition } from "./MainComposition";
import type { TimelineSpec } from "../types/spec";

// Proveemos un spec base (mock) para visualizar dentro de Remotion Studio
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
      sfx: []
    }
  ]
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
          return {
            durationInFrames: Math.max(1, Math.round(totalDurationSecs * 30)),
            props
          };
        }}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ spec: defaultSpec }}
      />
    </>
  );
};

registerRoot(RemotionRoot);

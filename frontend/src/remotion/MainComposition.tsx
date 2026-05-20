import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Sequence, Audio } from "remotion";
import React, { useState, useEffect } from "react";
import type { TimelineSpec } from "../types/spec";
import { generatedModules } from './generated/index.ts';

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
}

interface SceneProps {
  text: string;
  durationInFrames: number;
  [key: string]: unknown;
}

type SceneComponent = React.ComponentType<SceneProps>;

interface GeneratedModule {
  SceneComponent?: SceneComponent;
  default?: SceneComponent;
  [key: string]: unknown;
}

const DynamicScene = ({ type, text, durationInFrames, fallbackBg, fallbackColor }: DynamicSceneProps) => {
  const [Component, setComponent] = useState<SceneComponent | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadComponent = async () => {
      // FadeText/Fade Text son placeholders del LLM, usar fallback directamente
      if (type === "FadeText" || type === "Fade Text") {
        return; // No setError, simplemente no carga componente → fallback se activa
      }

      if (generatedModules[type]) {
        try {
          const mod = generatedModules[type] as GeneratedModule;
          // El contrato dice que la IA exportará `SceneComponent`
          if (mod.SceneComponent) {
            setComponent(mod.SceneComponent);
          } else if (mod.default) {
            setComponent(mod.default);
          } else {
             // Si el LLM nombra distinto al componente, agarramos el primer export
            const firstExport = Object.values(mod).find(
              (v): v is SceneComponent => typeof v === 'function'
            );
            if (firstExport) {
                setComponent(() => firstExport);
            } else {
                setError(true);
            }
          }
        } catch (e) {
          // Remotion composition: toast system not available here.
          // Log to console for debugging; fallback UI handles user-facing feedback.
          console.warn("Error loading generated scene:", e);
          setError(true);
        }
      } else {
        console.warn(`Scene ${type} not found in generated folder.`);
        setError(true);
      }
    };
    loadComponent();
  }, [type]);

  if (error || !Component) {
    // Fallback de seguridad
    return <FallbackScene text={text} fallbackBg={fallbackBg} fallbackColor={fallbackColor} isLoading={!error && !Component} />;
  }

  // Renderizar componente generado por la IA pasándole el contrato
  return <Component text={text} durationInFrames={durationInFrames} />;
};

export const MainComposition = ({ spec }: { spec: TimelineSpec }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {spec.scenes.map((scene, index) => {
        const fromFrame = Math.round(scene.start_time_seconds * fps);
        const durationInFrames = Math.max(1, Math.round(scene.duration_seconds * fps));

        return (
          <Sequence key={index} from={fromFrame} durationInFrames={durationInFrames}>
            <DynamicScene
               type={scene.type}
               text={scene.text}
               durationInFrames={durationInFrames}
               fallbackBg={scene.remotion_props?.backgroundColor || "#000"}
               fallbackColor={scene.remotion_props?.textColor || "#fff"}
            />
            {scene.audio_url && <Audio src={scene.audio_url} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

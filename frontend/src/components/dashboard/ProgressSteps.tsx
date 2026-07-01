import { Check, Loader2 } from 'lucide-react';

// El flujo del pipeline TERMINA en el preview (no auto-renderiza video). El render a MP4 es
// aparte y bajo demanda (Descargas), por eso aquí NO se muestra "Renderizando".
const PROCESSING_ORDER = [
  { key: 'pending', label: 'Iniciando' },
  { key: 'segmenting', label: 'Segmentando' },
  { key: 'segmented', label: 'Escenas generadas' },
  { key: 'visuals_generating', label: 'Generando visuales' },
  { key: 'processing_scenes', label: 'Creando animaciones' },
  { key: 'completed', label: 'Preview listo' },
];

// Solo cuando el usuario pide expresamente renderizar el MP4 (Descargas).
const RENDER_ORDER = [
  { key: 'queued_render', label: 'En cola de render' },
  { key: 'rendering', label: 'Renderizando video' },
  { key: 'completed_video', label: 'Video listo' },
];

interface ProgressStepsProps {
  status: string;
  /** Layout horizontal compacto (para banners que no deben ocupar tanto alto). */
  compact?: boolean;
}

export function ProgressSteps({ status, compact = false }: ProgressStepsProps) {
  const isRendering = status === 'queued_render' || status === 'rendering' || status === 'completed_video';
  const steps = isRendering ? RENDER_ORDER : PROCESSING_ORDER;

  // 'completed' cuenta como último paso alcanzado aunque no esté en RENDER_ORDER.
  let currentIndex = steps.findIndex((s) => s.key === status);
  if (currentIndex === -1 && (status === 'completed' || status === 'completed_video')) {
    currentIndex = steps.length - 1;
  }
  const isFailed = status === 'failed' || status === 'failed_render';

  if (compact) {
    // Horizontal: fila de círculos + conector, etiquetas debajo. Ocupa poco alto y todo el ancho.
    return (
      <div className="flex items-start w-full">
        {steps.map((step, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Conector a la izquierda (menos el primero) */}
              {i > 0 && (
                <div
                  className={`absolute top-3.5 right-1/2 left-[-50%] h-0.5 ${
                    i <= currentIndex ? 'bg-mint-precision/50' : 'bg-surface-high'
                  }`}
                />
              )}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  isComplete
                    ? 'bg-mint-precision text-deep-slate'
                    : isCurrent && !isFailed
                      ? 'bg-mint-precision/20 text-mint-precision border-2 border-mint-precision'
                      : isFailed && isCurrent
                        ? 'bg-error/20 text-error border-2 border-error'
                        : 'bg-surface-high text-text-secondary/30'
                }`}
              >
                {isComplete ? (
                  <Check size={12} strokeWidth={3} />
                ) : isCurrent && !isFailed ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isFailed && isCurrent ? (
                  '!'
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[9px] leading-tight text-center mt-1 px-0.5 ${
                  isCurrent ? 'text-mint-precision font-medium' : isComplete ? 'text-text-primary/70' : 'text-text-secondary/40'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isComplete
                    ? 'bg-mint-precision text-deep-slate'
                    : isCurrent
                      ? 'bg-mint-precision/20 text-mint-precision border-2 border-mint-precision'
                      : isFailed
                        ? 'bg-error/20 text-error border-2 border-error'
                        : 'bg-surface-high text-text-secondary/30'
                }`}
              >
                {isComplete ? (
                  <Check size={14} strokeWidth={3} />
                ) : isCurrent && !isFailed ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isFailed && isCurrent ? (
                  <span className="text-sm">!</span>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 h-6 mt-1 ${
                    isComplete ? 'bg-mint-precision/40' : 'bg-surface-high'
                  }`}
                />
              )}
            </div>

            {/* Step label */}
            <span
              className={`text-sm ${
                isComplete
                  ? 'text-text-primary'
                  : isCurrent
                    ? 'text-mint-precision font-medium'
                    : isFailed && isCurrent
                      ? 'text-error font-medium'
                      : 'text-text-secondary/40'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

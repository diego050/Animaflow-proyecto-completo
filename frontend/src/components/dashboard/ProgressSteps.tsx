import { Check, Loader2 } from 'lucide-react';

const PROCESSING_ORDER = [
  { key: 'pending', label: 'Iniciando' },
  { key: 'segmenting', label: 'Segmentando audio' },
  { key: 'visuals_generating', label: 'Generando visuales' },
  { key: 'processing_scenes', label: 'Procesando escenas' },
  { key: 'completed', label: 'Escenas listas' },
];

const RENDER_ORDER = [
  { key: 'queued_render', label: 'En cola de render' },
  { key: 'rendering', label: 'Renderizando video' },
  { key: 'completed_video', label: 'Video completado' },
];

interface ProgressStepsProps {
  status: string;
}

export function ProgressSteps({ status }: ProgressStepsProps) {
  const isRendering = status === 'queued_render' || status === 'rendering' || status === 'completed_video';
  const steps = isRendering ? RENDER_ORDER : PROCESSING_ORDER;

  const currentIndex = steps.findIndex((s) => s.key === status);
  const isFailed = status === 'failed' || status === 'failed_render';

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

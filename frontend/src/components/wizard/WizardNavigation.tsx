import { ArrowLeft } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';

interface WizardNavigationProps {
  wizardStep: number;
  onBack: () => void;
}

const STEPS = [
  { num: 1, label: 'Guión' },
  { num: 2, label: 'Revisar' },
  { num: 3, label: 'Procesando' },
  { num: 4, label: 'Escenas' },
  { num: 5, label: 'Preview' },
  { num: 6, label: 'Preview Listo' },
];

export function WizardNavigation({ wizardStep, onBack }: WizardNavigationProps) {
  return (
    <>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">
          {wizardStep > 1 ? 'Paso anterior' : 'Volver a proyectos'}
        </span>
      </button>

      {/* Step indicator */}
      <div className="relative flex items-center justify-between mb-8">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-surface-high" />

        {/* Progress line (filled portion) */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-mint-precision/40 transition-all"
          style={{ width: `${((wizardStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((item) => (
          <div key={item.num} className="relative z-10 flex flex-col items-center">
            <div
              className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                item.num < wizardStep
                  ? 'text-deep-slate'
                  : item.num === wizardStep
                    ? 'text-mint-precision border-2 border-mint-precision'
                    : 'text-text-secondary/30'
              }`}
            >
              {/* Base OPACA (color de página) → tapa la línea de progreso que pasa por detrás. */}
              <span className="absolute inset-0 rounded-full bg-deep-slate" />
              {/* Relleno del estado sobre la base opaca. */}
              <span
                className={`absolute inset-0 rounded-full ${
                  item.num < wizardStep
                    ? 'bg-mint-precision'
                    : item.num === wizardStep
                      ? 'bg-mint-precision/20'
                      : 'bg-surface-high'
                }`}
              />
              <span className="relative z-10">
                {item.num < wizardStep ? <CheckCircle2 size={14} strokeWidth={3} /> : item.num}
              </span>
            </div>
            <span
              className={`text-[10px] font-medium whitespace-nowrap mt-1.5 ${
                item.num === wizardStep
                  ? 'text-mint-precision'
                  : 'text-text-secondary/40'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

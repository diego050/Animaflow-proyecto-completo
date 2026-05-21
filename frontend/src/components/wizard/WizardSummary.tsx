import { ArrowRight, Loader2, Info, FileText } from 'lucide-react';

interface WizardSummaryProps {
  script: string;
  aspectRatio: string;
  selectedModel: string | null;
  customWidth: number;
  customHeight: number;
  onScriptChange: (value: string) => void;
  onCreate: () => void;
  loading: boolean;
}

export function WizardSummary({
  script,
  aspectRatio,
  selectedModel,
  customWidth,
  customHeight,
  onScriptChange,
  onCreate,
  loading,
}: WizardSummaryProps) {
  const aspectDisplay = aspectRatio === 'custom'
    ? `${customWidth}×${customHeight}`
    : aspectRatio;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Revisa el guión
        </h2>
        <p className="text-text-secondary text-sm">
          Puedes editar el texto antes de crear el proyecto.
        </p>
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-mint-precision" />
          <span className="text-sm font-semibold text-text-primary">Guión generado</span>
        </div>
        <textarea
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          className="w-full h-48 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
        />
        <div className="flex justify-between text-xs text-text-secondary/60 mt-2 px-1">
          <span>{script.split(/\s+/).filter(Boolean).length} palabras</span>
          <span>≈ {(script.split(/\s+/).filter(Boolean).length / 2.17).toFixed(1)}s</span>
        </div>
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-text-secondary/50 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-text-secondary">
              El guión se dividirá automáticamente en segmentos de ~7 segundos.
              Cada segmento generará su propia escena con visuales y audio.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <p className="text-xs text-text-secondary/40">
                Relación de aspecto: <span className="text-mint-precision">{aspectDisplay}</span>
              </p>
              {selectedModel && (
                <p className="text-xs text-text-secondary/40">
                  Modelo: <span className="text-mint-precision">{selectedModel}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onCreate}
        disabled={loading || !script.trim()}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
          script.trim() && !loading
            ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
            : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creando proyecto...
          </>
        ) : (
          <>
            <ArrowRight size={16} />
            Crear Proyecto
          </>
        )}
      </button>
    </div>
  );
}

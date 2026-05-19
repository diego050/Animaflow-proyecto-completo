import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';

interface WizardStepScriptProps {
  mode: 'own-script' | 'ai-generate';
  info: string;
  onInfoChange: (value: string) => void;
  onContinue?: () => void;
  onGenerate?: () => void;
  loading?: boolean;
}

export function WizardStepScript({
  mode,
  info,
  onInfoChange,
  onContinue,
  onGenerate,
  loading,
}: WizardStepScriptProps) {
  if (mode === 'own-script') {
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Tu guión
          </label>
          <textarea
            value={info}
            onChange={(e) => onInfoChange(e.target.value)}
            placeholder="Pega o escribe tu guión aquí..."
            className="w-full h-48 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
          />
        </div>

        <button
          onClick={onContinue}
          disabled={!info.trim()}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
            info.trim()
              ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
              : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
          }`}
        >
          <ArrowRight size={16} />
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Describe tu proyecto
        </label>
        <textarea
          value={info}
          onChange={(e) => onInfoChange(e.target.value)}
          placeholder="Ej: Un video promocional para mi tienda de ropa, enfocado en la colección de verano..."
          className="w-full h-32 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
        />
      </div>

      <button
        onClick={onGenerate}
        disabled={loading || !info.trim()}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
          info.trim() && !loading
            ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
            : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generando guión...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generar Guión con IA
          </>
        )}
      </button>
    </div>
  );
}

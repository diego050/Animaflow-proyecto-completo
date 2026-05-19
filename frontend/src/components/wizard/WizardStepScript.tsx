import { useState } from 'react';
import { ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface WizardStepScriptProps {
  mode: 'own-script' | 'ai-generate';
  info: string;
  templateId: string;
  customPrompt: string;
  onInfoChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onCustomPromptChange: (value: string) => void;
  onContinue?: () => void;
  onGenerate?: () => void;
  loading?: boolean;
}

const TEMPLATES = [
  { id: 'viral_shorts', name: 'Viral Shorts', description: 'Cortos y pegajosos para TikTok/Reels' },
  { id: 'educational', name: 'Educativo', description: 'Contenido claro y estructurado' },
  { id: 'storytelling', name: 'Storytelling', description: 'Narrativa emocional' },
  { id: 'promotional', name: 'Promocional', description: 'Para promover productos' },
];

export function WizardStepScript({
  mode,
  info,
  templateId,
  customPrompt,
  onInfoChange,
  onTemplateChange,
  onCustomPromptChange,
  onContinue,
  onGenerate,
  loading,
}: WizardStepScriptProps) {
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

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
      {/* Template selector */}
      <div>
        <label className="text-xs text-text-secondary/60 mb-2 block">Estilo de guión</label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTemplateChange(t.id)}
              className={`p-3 rounded-lg text-left text-sm transition-all ${
                templateId === t.id
                  ? 'bg-mint-precision/10 border border-mint-precision/40 text-mint-precision'
                  : 'bg-surface-lowest border border-border-tech text-text-secondary hover:text-text-primary'
              }`}
            >
              <p className="font-medium">{t.name}</p>
              <p className="text-xs opacity-70">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt toggle */}
      <button
        onClick={() => setShowCustomPrompt(!showCustomPrompt)}
        className="flex items-center gap-1 text-xs text-mint-precision hover:underline"
      >
        {showCustomPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showCustomPrompt ? 'Ocultar' : 'Personalizar'} instrucciones de IA
      </button>

      {showCustomPrompt && (
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="Escribe instrucciones personalizadas para la IA..."
          className="w-full bg-surface-container border border-border-tech rounded-lg p-3 text-sm text-text-primary mb-2"
          rows={4}
        />
      )}

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

import { useState, useCallback, useEffect } from 'react';
import { Pencil, Wand2, Film, Settings, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '../../store/useWizardStore';
import { useDesignTemplatesStore } from '../../store/useDesignTemplatesStore';
import { WizardStepScript } from './WizardStepScript';
import { WizardStepVoice } from './WizardStepVoice';
import { AspectRatioSelector, ModelSelector } from './WizardStepConfig';
import { DesignTemplateModal } from './DesignTemplateModal';
import type { UserLLMSettings } from '../../types/auth';

type WizardMode = 'own-script' | 'ai-generate' | 'animation-only';

interface ModeCard {
  id: WizardMode;
  icon: React.ElementType;
  title: string;
  description: string;
}

const MODE_CARDS: ModeCard[] = [
  {
    id: 'own-script',
    icon: Pencil,
    title: 'Tengo mi guión',
    description: 'Pega o sube tu guión existente. La IA lo segmentará en escenas automáticamente.',
  },
  {
    id: 'ai-generate',
    icon: Wand2,
    title: 'Generar con IA',
    description: 'Describe tu proyecto y la IA creará el guión, las escenas y los prompts visuales.',
  },
  {
    id: 'animation-only',
    icon: Film,
    title: 'Solo Animación',
    description: 'Define escenas manualmente con prompts visuales. Ideal para motion design puro.',
  },
];

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-surface-highest border border-border-tech px-3 py-2 text-xs text-text-secondary opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 z-50">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border-tech" />
      </span>
    </span>
  );
}

interface WizardStepInfoProps {
  info: string;
  aspectRatio: string;
  voiceId: string | null;
  voices: { id: string; name: string; isDefault: boolean }[];
  voicesLoading: boolean;
  llmSettings: UserLLMSettings | null;
  selectedModel: string | null;
  customWidth: number;
  customHeight: number;
  templateId: string;
  customPrompt: string;
  targetDurationSeconds: number;
  durationUnit: 'seconds' | 'words';
  designTemplateId?: string;
  onInfoChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
  onModelChange: (value: string | null) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
  onTemplateChange: (value: string) => void;
  onCustomPromptChange: (value: string) => void;
  onDurationChange: (seconds: number) => void;
  onUnitChange: (unit: 'seconds' | 'words') => void;
  onDesignTemplateChange?: (id: string) => void;
  onGenerate: () => void;
  onCreate: () => void;
  loading: boolean;
}

export function WizardStepInfo({
  info,
  aspectRatio,
  voiceId,
  voices,
  voicesLoading,
  llmSettings,
  selectedModel,
  customWidth,
  customHeight,
  templateId,
  customPrompt,
  targetDurationSeconds,
  durationUnit,
  designTemplateId,
  onInfoChange,
  onAspectRatioChange,
  onVoiceChange,
  onModelChange,
  onCustomWidthChange,
  onCustomHeightChange,
  onTemplateChange,
  onCustomPromptChange,
  onDurationChange,
  onUnitChange,
  onDesignTemplateChange,
  onGenerate,
  onCreate,
  loading,
}: WizardStepInfoProps) {
  const [mode, setMode] = useState<WizardMode>('own-script');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { wizardData, setWizardData } = useWizardStore();
  const { templates, fetchTemplates } = useDesignTemplatesStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleContinueWithOwnScript = useCallback(() => {
    // If text-only, we need info. If with-prompts, we need scenes.
    if (mode === 'animation-only') {
      if (wizardData.scenes.length === 0 || wizardData.scenes.some(s => !s.media_query.trim())) return;
      setWizardData({ script: 'Solo Animación', skippedReview: true, wizardMode: 'animation-only' });
      onCreate();
      return;
    }

    if (wizardData.ownScriptMode === 'with-prompts') {
      if (wizardData.scenes.length === 0 || wizardData.scenes.some(s => !s.text.trim())) return;
    } else {
      if (!info.trim()) return;
    }
    setWizardData({ script: info, skippedReview: true, wizardMode: 'own-script' });
    onCreate();
  }, [mode, info, wizardData.ownScriptMode, wizardData.scenes, setWizardData, onCreate]);

  const isContinueDisabled = mode === 'animation-only'
    ? wizardData.scenes.length === 0 || wizardData.scenes.some(s => !s.media_query.trim())
    : wizardData.ownScriptMode === 'with-prompts'
      ? wizardData.scenes.length === 0 || wizardData.scenes.some(s => !s.text.trim())
      : !info.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Crea tu proyecto
        </h2>
        <p className="text-text-secondary text-sm">
          Pega tu guión o genera uno con IA.
        </p>
      </div>

      {/* Mode selector — descriptive cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODE_CARDS.map((card) => {
          const Icon = card.icon;
          const isActive = mode === card.id;
          return (
            <button
              key={card.id}
              onClick={() => {
                setMode(card.id);
                if (card.id === 'animation-only' && wizardData.scenes.length === 0) {
                  setWizardData({ ownScriptMode: 'with-prompts', scenes: [{ text: '', media_query: '', duration_seconds: 7 }] });
                } else if (card.id !== 'animation-only') {
                  setWizardData({ ownScriptMode: 'text-only' });
                }
              }}
              className={`relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                isActive
                  ? 'border-mint-precision/40 bg-surface-high shadow-[0_0_16px_rgba(0,255,171,0.06)]'
                  : 'border-border-tech bg-surface-lowest hover:bg-surface-high hover:border-border-tech/80'
              }`}
            >
              {/* Icon */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                isActive ? 'bg-mint-precision/10 text-mint-precision' : 'bg-surface-container text-text-secondary'
              }`}>
                <Icon size={20} />
              </div>

              {/* Title + Description */}
              <div className="flex-1">
                <p className={`font-display font-bold text-sm transition-colors ${
                  isActive ? 'text-mint-precision' : 'text-text-primary'
                }`}>
                  {card.title}
                </p>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Check indicator */}
              {isActive && (
                <div className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-mint-precision/20">
                  <Check size={12} className="text-mint-precision" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Main input area — always visible */}
      <WizardStepScript
        mode={mode}
        ownScriptMode={wizardData.ownScriptMode}
        scenes={wizardData.scenes}
        designMd={wizardData.designMd}
        info={info}
        templateId={templateId}
        customPrompt={customPrompt}
        onOwnScriptModeChange={(val) => setWizardData({ ownScriptMode: val })}
        onScenesChange={(scenes) => setWizardData({ scenes })}
        onDesignMdChange={(designMd) => setWizardData({ designMd })}
        onInfoChange={onInfoChange}
        onTemplateChange={onTemplateChange}
        onCustomPromptChange={onCustomPromptChange}
        onContinue={handleContinueWithOwnScript}
        onGenerate={onGenerate}
        loading={loading}
      />

      {/* Advanced settings — collapsible */}
      <div className="border-t border-border-tech/50 pt-2">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors py-2"
        >
          <Settings size={14} />
          Configuración avanzada
          <motion.div
            animate={{ rotate: advancedOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>

        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-5 pt-4 pb-2">
                {/* Model selector */}
                <Tooltip text="Modelo que generará el guión y los prompts visuales">
                  <ModelSelector
                    llmSettings={llmSettings}
                    selectedModel={selectedModel}
                    onChange={onModelChange}
                  />
                </Tooltip>

                {/* Design template selector */}
                {onDesignTemplateChange && (
                  <div>
                    <label className="block text-text-secondary text-sm font-medium mb-2">
                      Diseño guardado (opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={designTemplateId || ''}
                        onChange={(e) => onDesignTemplateChange(e.target.value)}
                        className="flex-1 bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
                      >
                        <option value="">Ninguno</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowTemplateModal(true)}
                        className="p-2.5 rounded-lg bg-surface-high border border-border-tech text-text-secondary hover:text-mint-precision hover:border-mint-precision/30 transition-colors"
                        aria-label="Gestionar diseños"
                        title="Gestionar diseños"
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Duration control - only in AI generate mode */}
                {mode === 'ai-generate' && (
                  <Tooltip text="La IA dividirá el guión en segmentos de ~7 segundos">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">
                        Duración estimada
                      </label>

                      {/* Toggle Segundos / Palabras */}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => onUnitChange('seconds')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            durationUnit === 'seconds'
                              ? 'bg-mint-precision text-deep-slate'
                              : 'bg-surface-high text-text-secondary hover:bg-surface-container'
                          }`}
                        >
                          Segundos
                        </button>
                        <button
                          onClick={() => onUnitChange('words')}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            durationUnit === 'words'
                              ? 'bg-mint-precision text-deep-slate'
                              : 'bg-surface-high text-text-secondary hover:bg-surface-container'
                          }`}
                        >
                          Palabras
                        </button>
                      </div>

                      {/* Number Input */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-xs">
                          <input
                            type="number"
                            value={durationUnit === 'seconds' ? targetDurationSeconds : Math.round(targetDurationSeconds * 2.17)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (isNaN(val) || val < 0) return;
                              if (durationUnit === 'seconds') {
                                onDurationChange(val);
                              } else {
                                onDurationChange(Math.round(val / 2.17));
                              }
                            }}
                            placeholder={durationUnit === 'seconds' ? '15' : '30'}
                            className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none text-center transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <span className="text-sm font-semibold text-text-secondary whitespace-nowrap">
                          {durationUnit === 'seconds' ? 'segundos' : 'palabras'}
                        </span>
                      </div>

                      {/* Equivalente */}
                      <p className="text-xs text-text-secondary/60 mt-1">
                        {durationUnit === 'seconds'
                          ? `≈ ${Math.round(targetDurationSeconds * 2.17)} palabras · ${Math.max(1, Math.ceil(targetDurationSeconds / 7))} escenas`
                          : `≈ ${Math.round(targetDurationSeconds)} segundos · ${Math.max(1, Math.ceil(targetDurationSeconds / 7))} escenas`
                        }
                      </p>
                    </div>
                  </Tooltip>
                )}

                {/* Voice selector - only in AI generate mode */}
                {mode === 'ai-generate' && (
                  <Tooltip text="Voz que narrará tu video (solo modo IA con audio)">
                    <WizardStepVoice
                      voiceId={voiceId}
                      voices={voices}
                      voicesLoading={voicesLoading}
                      onChange={onVoiceChange}
                    />
                  </Tooltip>
                )}

                {/* Aspect ratio */}
                <Tooltip text="Formato de salida del video final">
                  <AspectRatioSelector
                    value={aspectRatio}
                    onChange={onAspectRatioChange}
                    customWidth={customWidth}
                    customHeight={customHeight}
                    onCustomWidthChange={onCustomWidthChange}
                    onCustomHeightChange={onCustomHeightChange}
                  />
                </Tooltip>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary CTA — always last */}
      <button
        onClick={mode === 'ai-generate' ? onGenerate : handleContinueWithOwnScript}
        disabled={loading || isContinueDisabled}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 ${
          !loading && !isContinueDisabled
            ? 'bg-mint-precision text-deep-slate hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,171,0.25)] hover:-translate-y-0.5'
            : 'bg-surface-high text-text-secondary/40 cursor-not-allowed opacity-40'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {mode === 'ai-generate' ? 'Generando guión...' : 'Procesando...'}
          </>
        ) : (
          <>
            {mode === 'own-script' && <Pencil size={16} />}
            {mode === 'ai-generate' && <Wand2 size={16} />}
            {mode === 'animation-only' && <Film size={16} />}
            {mode === 'own-script' && 'Continuar'}
            {mode === 'ai-generate' && 'Generar Guión con IA'}
            {mode === 'animation-only' && 'Crear Proyecto'}
          </>
        )}
      </button>

      {/* Design template management modal */}
      <DesignTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />
    </div>
  );
}

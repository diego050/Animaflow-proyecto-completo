import { useState, useCallback } from 'react';
import { Pencil, Wand2, Film } from 'lucide-react';
import { useWizardStore } from '../../store/useWizardStore';
import { WizardStepScript } from './WizardStepScript';
import { WizardStepVoice } from './WizardStepVoice';
import { AspectRatioSelector, ModelSelector } from './WizardStepConfig';
import type { UserLLMSettings } from '../../types/auth';

type WizardMode = 'own-script' | 'ai-generate' | 'animation-only';

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
  onGenerate,
  onCreate,
  loading,
}: WizardStepInfoProps) {
  const [mode, setMode] = useState<WizardMode>('own-script');
  const { wizardData, setWizardData } = useWizardStore();

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

      {/* Mode toggle */}
      <div className="flex bg-surface-lowest border border-border-tech rounded-lg p-1">
        <button
          onClick={() => setMode('own-script')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'own-script'
              ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Pencil size={16} />
          Tengo mi guión
        </button>
        <button
          onClick={() => setMode('ai-generate')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'ai-generate'
              ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Wand2 size={16} />
          Generar con IA
        </button>
        <button
          onClick={() => {
            setMode('animation-only');
            if (wizardData.scenes.length === 0) {
              setWizardData({ ownScriptMode: 'with-prompts', scenes: [{ text: '', media_query: '', duration_seconds: 7 } as any] });
            } else {
              setWizardData({ ownScriptMode: 'with-prompts' });
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'animation-only'
              ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Film size={16} />
          Solo Animación
        </button>
      </div>

      {/* Model selector - shown in both modes */}
      <ModelSelector
        llmSettings={llmSettings}
        selectedModel={selectedModel}
        onChange={onModelChange}
      />

      {/* Duration control - only in AI generate mode */}
      {mode === 'ai-generate' && (
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
            <input
              type="number"
              min={durationUnit === 'seconds' ? 10 : 22}
              max={durationUnit === 'seconds' ? 120 : 260}
              value={durationUnit === 'seconds' ? targetDurationSeconds : Math.round(targetDurationSeconds * 2.17)}
              onChange={(e) => {
                const val = Number(e.target.value);
                // Allow empty or partial input, validate on blur if needed, but min/max bounds can just clamp.
                if (durationUnit === 'seconds') {
                  onDurationChange(Math.max(10, Math.min(120, val)));
                } else {
                  onDurationChange(Math.max(10, Math.min(120, Math.round(val / 2.17))));
                }
              }}
              className="bg-surface-lowest border border-border-tech rounded-lg px-4 py-2 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none w-24 text-center transition-colors"
            />
            <span className="text-sm font-semibold text-text-secondary">
              {durationUnit === 'seconds' ? 'segundos' : 'palabras'}
            </span>
          </div>

          {/* Equivalente en la otra unidad */}
          <p className="text-xs text-text-secondary/60 mt-1">
            {durationUnit === 'seconds'
              ? `≈ ${Math.round(targetDurationSeconds * 2.17)} palabras · ${Math.ceil(targetDurationSeconds / 7)} escenas`
              : `≈ ${Math.round(targetDurationSeconds)} segundos · ${Math.ceil(targetDurationSeconds / 7)} escenas`
            }
          </p>
        </div>
      )}

      {/* Script input */}
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

      {/* Voice selector - only in AI generate mode */}
      {mode === 'ai-generate' && (
        <WizardStepVoice
          voiceId={voiceId}
          voices={voices}
          voicesLoading={voicesLoading}
          onChange={onVoiceChange}
        />
      )}

      {/* Aspect ratio */}
      <AspectRatioSelector
        value={aspectRatio}
        onChange={onAspectRatioChange}
        customWidth={customWidth}
        customHeight={customHeight}
        onCustomWidthChange={onCustomWidthChange}
        onCustomHeightChange={onCustomHeightChange}
      />
    </div>
  );
}

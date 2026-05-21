import { useState, useCallback } from 'react';
import { Pencil, Wand2 } from 'lucide-react';
import { useWizardStore } from '../../store/useWizardStore';
import { WizardStepScript } from './WizardStepScript';
import { WizardStepVoice } from './WizardStepVoice';
import { AspectRatioSelector, ModelSelector } from './WizardStepConfig';
import type { UserLLMSettings } from '../../types/auth';

type WizardMode = 'own-script' | 'ai-generate';

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
  const { setWizardData } = useWizardStore();

  const handleContinueWithOwnScript = useCallback(() => {
    if (!info.trim()) return;
    setWizardData({ script: info, skippedReview: true, wizardMode: 'own-script' });
    onCreate();
  }, [info, setWizardData, onCreate]);

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
      </div>

      {/* Model selector - shown in both modes */}
      <ModelSelector
        llmSettings={llmSettings}
        selectedModel={selectedModel}
        onChange={onModelChange}
      />

      {/* Duration control */}
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

        {/* Slider */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={durationUnit === 'seconds' ? 10 : 22}
            max={durationUnit === 'seconds' ? 120 : 260}
            step={durationUnit === 'seconds' ? 5 : 11}
            value={durationUnit === 'seconds' ? targetDurationSeconds : Math.round(targetDurationSeconds * 2.17)}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (durationUnit === 'seconds') {
                onDurationChange(val);
              } else {
                onDurationChange(Math.round(val / 2.17));
              }
            }}
            className="flex-1 accent-mint-precision"
          />
          <span className="text-sm font-semibold text-mint-precision w-20 text-right">
            {durationUnit === 'seconds'
              ? `${targetDurationSeconds}s`
              : `${Math.round(targetDurationSeconds * 2.17)} palabras`
            }
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

      {/* Script input */}
      <WizardStepScript
        mode={mode}
        info={info}
        templateId={templateId}
        customPrompt={customPrompt}
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

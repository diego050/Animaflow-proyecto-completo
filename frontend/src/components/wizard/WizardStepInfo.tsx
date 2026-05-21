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
  onInfoChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
  onModelChange: (value: string | null) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
  onTemplateChange: (value: string) => void;
  onCustomPromptChange: (value: string) => void;
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
  onInfoChange,
  onAspectRatioChange,
  onVoiceChange,
  onModelChange,
  onCustomWidthChange,
  onCustomHeightChange,
  onTemplateChange,
  onCustomPromptChange,
  onGenerate,
  onCreate,
  loading,
}: WizardStepInfoProps) {
  const [mode, setMode] = useState<WizardMode>('own-script');
  const { setWizardData, setWizardStep } = useWizardStore();

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

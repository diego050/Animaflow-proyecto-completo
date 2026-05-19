import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '../../store/useWizardStore';
import { useJobsStore } from '../../store/useJobsStore';
import { useVoicesStore } from '../../store/useVoicesStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { WizardNavigation } from '../../components/wizard/WizardNavigation';
import { WizardStepInfo } from '../../components/wizard/WizardStepInfo';
import { WizardSummary } from '../../components/wizard/WizardSummary';
import { WizardStepProcessing } from '../../components/wizard/WizardStepProcessing';
import { WizardStepDone } from '../../components/wizard/WizardStepDone';

export function NewProjectWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wizardStep, wizardData, setWizardStep, setWizardData, resetWizard } =
    useWizardStore();
  const { generateScript, createJob, startPolling, selectedJob } = useJobsStore();
  const { voices, voicesLoading, fetchVoices } = useVoicesStore();
  const { settings } = useSettingsStore();
  const { fetchLLMSettings, llmSettings } = useAuthStore();

  const [scriptLoading, setScriptLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch voices and LLM settings on mount
  useEffect(() => {
    if (voices.length === 0) {
      fetchVoices();
    }
    fetchLLMSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from ScriptsPage "Usar en proyecto"
  useEffect(() => {
    const state = location.state as
      | { prefillScript?: string; prefillAspectRatio?: string }
      | undefined;
    if (state?.prefillScript) {
      setWizardData({
        script: state.prefillScript,
        aspectRatio:
          state.prefillAspectRatio || settings.defaultAspectRatio || '9:16',
      });
      setWizardStep(2);
      window.history.replaceState({}, '');
    }
  }, [location.state, setWizardData, setWizardStep, settings]);

  const handleGenerateScript = useCallback(async () => {
    if (!wizardData.info.trim()) {
      setError('Ingresa una descripción para tu proyecto.');
      return;
    }
    setError(null);
    setScriptLoading(true);
    try {
      const script = await generateScript(
        wizardData.info,
        wizardData.templateId,
        wizardData.customPrompt || null,
      );
      setWizardData({ script });
      setWizardStep(2);
    } catch {
      setError('Error generando el guión. Intenta de nuevo.');
    } finally {
      setScriptLoading(false);
    }
  }, [
    wizardData.info,
    wizardData.templateId,
    wizardData.customPrompt,
    generateScript,
    setWizardData,
    setWizardStep,
  ]);

  const handleCreateProject = useCallback(async () => {
    if (!wizardData.script.trim()) {
      setError('El guión no puede estar vacío.');
      return;
    }
    setError(null);
    setCreateLoading(true);
    try {
      const jobId = await createJob(
        wizardData.script,
        wizardData.aspectRatio,
        wizardData.voiceId || undefined,
        wizardData.selectedModel,
      );
      setWizardData({ generatedJobId: jobId });
      setWizardStep(3);
      startPolling(jobId);
    } catch {
      setError('Error creando el proyecto. Intenta de nuevo.');
    } finally {
      setCreateLoading(false);
    }
  }, [
    wizardData.script,
    wizardData.aspectRatio,
    wizardData.voiceId,
    wizardData.selectedModel,
    createJob,
    setWizardData,
    setWizardStep,
    startPolling,
  ]);

  // Auto-advance when job completes
  if (wizardStep === 3 && selectedJob) {
    const status = selectedJob.status;
    if (status === 'completed' || status === 'completed_video') {
      setWizardStep(4);
    }
  }

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <WizardNavigation wizardStep={wizardStep} onBack={handleBack} />

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3 text-sm text-error"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {wizardStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WizardStepInfo
              info={wizardData.info}
              aspectRatio={wizardData.aspectRatio}
              voiceId={wizardData.voiceId}
              voices={voices}
              voicesLoading={voicesLoading}
              llmSettings={llmSettings}
              selectedModel={wizardData.selectedModel}
              customWidth={wizardData.customWidth}
              customHeight={wizardData.customHeight}
              templateId={wizardData.templateId}
              customPrompt={wizardData.customPrompt}
              onInfoChange={(info) => setWizardData({ info })}
              onAspectRatioChange={(aspectRatio) =>
                setWizardData({ aspectRatio })
              }
              onVoiceChange={(voiceId) => setWizardData({ voiceId })}
              onModelChange={(selectedModel) =>
                setWizardData({ selectedModel })
              }
              onCustomWidthChange={(customWidth) =>
                setWizardData({ customWidth })
              }
              onCustomHeightChange={(customHeight) =>
                setWizardData({ customHeight })
              }
              onTemplateChange={(templateId) => setWizardData({ templateId })}
              onCustomPromptChange={(customPrompt) =>
                setWizardData({ customPrompt })
              }
              onGenerate={handleGenerateScript}
              loading={scriptLoading}
            />
          </motion.div>
        )}

        {wizardStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WizardSummary
              script={wizardData.script}
              aspectRatio={wizardData.aspectRatio}
              selectedModel={wizardData.selectedModel}
              customWidth={wizardData.customWidth}
              customHeight={wizardData.customHeight}
              onScriptChange={(script) => setWizardData({ script })}
              onCreate={handleCreateProject}
              loading={createLoading}
            />
          </motion.div>
        )}

        {wizardStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WizardStepProcessing status={selectedJob?.status} />
          </motion.div>
        )}

        {wizardStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WizardStepDone
              projectId={wizardData.generatedJobId || undefined}
              onViewProject={(projectId) => {
                navigate(`/dashboard/project/${projectId}`);
                resetWizard();
              }}
              onCreateAnother={() => {
                resetWizard();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



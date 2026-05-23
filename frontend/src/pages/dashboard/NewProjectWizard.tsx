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
import { WizardStepReviewScenes } from '../../components/wizard/WizardStepReviewScenes';

export function NewProjectWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { wizardStep, wizardData, setWizardStep, setWizardData, resetWizard } =
    useWizardStore();
  const { generateScript, createJob, startPolling, selectedJob, approveScenes } = useJobsStore();
  const { voices, voicesLoading, fetchVoices } = useVoicesStore();
  const { settings } = useSettingsStore();
  const { fetchLLMSettings, llmSettings } = useAuthStore();

  const [scriptLoading, setScriptLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnitChange = useCallback((unit: 'seconds' | 'words') => {
    setWizardData({ durationUnit: unit });
  }, [setWizardData]);

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
        wizardData.targetDurationSeconds,
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
    wizardData.targetDurationSeconds,
    generateScript,
    setWizardData,
    setWizardStep,
  ]);

  const handleCreateProject = useCallback(async () => {
    const isAnimationOnly = wizardData.wizardMode === 'animation-only';
    const scriptToUse = isAnimationOnly ? "Solo Animación" : wizardData.script;
    if (!isAnimationOnly && !scriptToUse.trim()) {
      setError('El guión no puede estar vacío.');
      return;
    }
    setError(null);
    setCreateLoading(true);
    try {
      const jobId = await createJob(
        scriptToUse,
        wizardData.aspectRatio,
        wizardData.voiceId || undefined,
        wizardData.selectedModel,
        wizardData.scenes,
        wizardData.designMd,
        wizardData.customPrompt,
        isAnimationOnly
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

  // Auto-advance based on job status
  if (selectedJob) {
    const status = selectedJob.status;
    if (wizardStep === 3) {
      if (status === 'segmented') {
        setWizardStep(4);
      } else if (status === 'completed' || status === 'completed_video') {
        setWizardStep(6);
      } else if (status === 'failed' || status === 'failed_render') {
        setWizardStep(6);
      }
    } else if (wizardStep === 5) {
      if (status === 'completed' || status === 'completed_video') {
        setWizardStep(6);
      } else if (status === 'failed' || status === 'failed_render') {
        setWizardStep(6);
      }
    }
  }

  const handleApproveScenes = async (scenes: Array<{
    text: string;
    media_query: string;
    start_time_seconds: number;
    duration_seconds: number;
  }>) => {
    if (!wizardData.generatedJobId) return;
    setApproveLoading(true);
    setError(null);
    try {
      await approveScenes(wizardData.generatedJobId, scenes);
      setWizardStep(5);
    } catch {
      setError('Error aprobando las escenas. Intenta de nuevo.');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleBack = () => {
    if (wizardStep === 3 && wizardData.skippedReview) {
      setWizardStep(1);
    } else if (wizardStep === 4) {
      // From scene review, go back to script review (step 2)
      setWizardStep(2);
    } else if (wizardStep === 5 || wizardStep === 6) {
      // From processing continuation or done, go to dashboard
      navigate('/dashboard');
    } else if (wizardStep > 1) {
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
              targetDurationSeconds={wizardData.targetDurationSeconds}
              durationUnit={wizardData.durationUnit}
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
              onDurationChange={(targetDurationSeconds) =>
                setWizardData({ targetDurationSeconds })
              }
              onUnitChange={handleUnitChange}
              onGenerate={handleGenerateScript}
              onCreate={handleCreateProject}
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
            <WizardStepProcessing status={selectedJob?.status} jobId={selectedJob?.job_id} />
          </motion.div>
        )}

        {wizardStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WizardStepReviewScenes
              scenes={selectedJob?.result_spec?.scenes || []}
              onApprove={handleApproveScenes}
              loading={approveLoading}
            />
          </motion.div>
        )}

        {wizardStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WizardStepProcessing status={selectedJob?.status} />
          </motion.div>
        )}

        {wizardStep === 6 && (
          <motion.div
            key="step6"
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



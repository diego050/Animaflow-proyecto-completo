import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useJobsStore } from '../../store/useJobsStore';
import { useToastStore } from '../../store/useToastStore';
import { isTerminalStatus, isProcessingStatus, isRenderStatus } from '../../types/job';
import { ProjectHeader } from '../../components/project/ProjectHeader';
import { ProjectStatusBanner } from '../../components/project/ProjectStatusBanner';
import { ProjectTabs, type TabKey } from '../../components/project/ProjectTabs';
import { SceneTimeline } from '../../components/project/SceneTimeline';
import { PreviewPlayer } from '../../components/project/PreviewPlayer';
import { ExportPanel } from '../../components/project/ExportPanel';

export function ProjectDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { selectedJob, selectedJobLoading, selectJob, fetchJobs, triggerRender, triggerAEExport, regenerateAEExport, startPolling, stopPolling, approveScenes } =
    useJobsStore();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<TabKey>('script');
  const [exportLoading, setExportLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [focusSceneIndex, setFocusSceneIndex] = useState<number | null>(null);
  const [selectedSceneIndices, setSelectedSceneIndices] = useState<Set<number>>(new Set());

  const defaultName = `Proyecto ${jobId?.slice(0, 8) ?? ''}`;
  const [projectName, setProjectName] = useState(defaultName);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (selectedJob) {
      const name = (selectedJob as { name?: string }).name;
      if (name) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProjectName(name);
      }
    }
  }, [selectedJob]);

  const handleSaveName = async () => {
    setIsEditingName(false);
    const trimmed = projectName.trim();
    if (!trimmed) {
      setProjectName(defaultName);
      return;
    }
    try {
      const token = localStorage.getItem('animaflow_token');
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      // Silently fail — name is still updated locally
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setProjectName(defaultName);
  };

  useEffect(() => {
    if (!jobId) return;
    selectJob(jobId);
  }, [jobId, selectJob]);

  useEffect(() => {
    if (!selectedJob) return;
    if (!isTerminalStatus(selectedJob.status)) {
      startPolling(selectedJob.job_id);
    }
    return () => {
      stopPolling();
    };
  }, [selectedJob, startPolling, stopPolling]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSceneIndices(new Set());
  }, [jobId]);

  const handleToggleSceneSelection = useCallback((index: number) => {
    setSelectedSceneIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleRender = useCallback(async () => {
    if (!jobId) return;
    setRenderLoading(true);
    try {
      await triggerRender(jobId);
      addToast('success', 'Render iniciado correctamente');
    } catch {
      addToast('error', 'Error al iniciar el render. Intenta de nuevo.');
    } finally {
      setRenderLoading(false);
    }
  }, [jobId, triggerRender, addToast]);

  const handleApprove = useCallback(async () => {
    if (!jobId || !selectedJob?.result_spec?.scenes) return;
    setApproveLoading(true);
    try {
      await approveScenes(jobId, selectedJob.result_spec.scenes);
      addToast('success', 'Escenas aprobadas. Iniciando procesamiento...');
      startPolling(jobId);
    } catch {
      addToast('error', 'Error al aprobar las escenas. Intenta de nuevo.');
    } finally {
      setApproveLoading(false);
    }
  }, [jobId, selectedJob, approveScenes, startPolling, addToast]);

  const handleAEExport = useCallback(async () => {
    if (!jobId) return;
    setExportLoading(true);
    try {
      await triggerAEExport(jobId);
      const token = localStorage.getItem('animaflow_token');
      let attempts = 0;
      const maxAttempts = 120;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusRes = await fetch(
          `/api/jobs/${jobId}/export/after-effects/status`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'completed') {
            const downloadRes = await fetch(
              `/api/jobs/${jobId}/export/after-effects/download`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!downloadRes.ok) {
              throw new Error('Download failed');
            }
            const blob = await downloadRes.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = statusData.filename || `ae_export_${jobId.slice(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return;
          }
          if (statusData.status === 'failed') {
            throw new Error('AE export failed');
          }
        }
        attempts++;
      }
      throw new Error('Export timed out');
    } catch {
      addToast('error', 'Error al exportar para After Effects. Intenta de nuevo.');
    } finally {
      setExportLoading(false);
    }
  }, [jobId, triggerAEExport, addToast]);

  const handleRegenerateAE = useCallback(async () => {
    if (!jobId) return;
    setExportLoading(true);
    try {
      await regenerateAEExport(jobId);
      const token = localStorage.getItem('animaflow_token');
      let attempts = 0;
      const maxAttempts = 120;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusRes = await fetch(
          `/api/jobs/${jobId}/export/after-effects/status`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'completed') {
            const downloadRes = await fetch(
              `/api/jobs/${jobId}/export/after-effects/download`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!downloadRes.ok) {
              throw new Error('Download failed');
            }
            const blob = await downloadRes.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = statusData.filename || `ae_export_${jobId.slice(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return;
          }
          if (statusData.status === 'failed') {
            throw new Error('AE export failed');
          }
        }
        attempts++;
      }
      throw new Error('Export timed out');
    } catch {
      addToast('error', 'Error al regenerar After Effects. Intenta de nuevo.');
    } finally {
      setExportLoading(false);
    }
  }, [jobId, regenerateAEExport, addToast]);

  const handleSpecDownload = useCallback(async () => {
    if (!jobId) return;
    const token = localStorage.getItem('animaflow_token');
    const response = await fetch(
      `/api/jobs/${jobId}/export/spec-json`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      addToast('error', 'Error al descargar spec.json');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spec_${jobId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [jobId, addToast]);

  if (!jobId) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-error">No se encontró el ID del proyecto.</p>
      </div>
    );
  }

  if (selectedJobLoading && !selectedJob) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-mint-precision" />
      </div>
    );
  }

  if (!selectedJob) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <AlertTriangle size={32} className="mx-auto text-error mb-3" />
          <p className="text-error font-medium">Proyecto no encontrado</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-surface-high text-text-primary rounded-lg hover:bg-surface-highest transition-colors text-sm"
          >
            Volver a proyectos
          </button>
        </div>
      </div>
    );
  }

  const spec = selectedJob.result_spec;
  const isReadyToRender = selectedJob.status === 'completed';
  const isRendering = isRenderStatus(selectedJob.status);
  const isProcessing = isProcessingStatus(selectedJob.status);
  const isFailed = selectedJob.status === 'failed' || selectedJob.status === 'failed_render';

  return (
    <div className="p-6 lg:p-8">
      <ProjectHeader
        jobId={selectedJob.job_id}
        projectName={projectName}
        status={selectedJob.status}
        aspectRatio={selectedJob.result_spec?.aspect_ratio}
        sceneCount={spec?.scenes.length ?? 0}
        selectedScenes={Array.from(selectedSceneIndices)}
        currentSceneIndex={focusSceneIndex ?? undefined}
        isEditing={isEditingName}
        onStartEdit={() => setIsEditingName(true)}
        onSaveName={handleSaveName}
        onCancelEdit={handleCancelEdit}
        onNameChange={setProjectName}
        onNavigateBack={() => navigate('/dashboard')}
        onReformat={() => {
          fetchJobs();
        }}
      />

      <ProjectStatusBanner
        status={selectedJob.status}
        isProcessing={isProcessing}
        isRendering={isRendering}
        isFailed={isFailed}
      />

      <ProjectTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasSpec={!!spec}
      />

      <div className="min-h-[400px]">
        {activeTab === 'script' && spec && (
          <div className="space-y-4">
            {selectedJob.status === 'segmented' && (
              <div className="bg-mint-precision/10 border border-mint-precision/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-mint-precision font-bold text-sm">Escenas pendientes de aprobación</h3>
                  <p className="text-text-secondary text-xs mt-1">Revisa el guión y los prompts visuales. Una vez aprobados, comenzará la generación de componentes y el renderizado.</p>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={approveLoading}
                  className="px-6 py-2 bg-mint-precision text-deep-slate rounded-lg text-sm font-bold hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {approveLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Aprobar Escenas
                </button>
              </div>
            )}
            <SceneTimeline
            spec={spec}
            jobId={jobId}
            onRegenerateScene={async (index, mediaQuery, text) => {
              await useJobsStore.getState().regenerateScene(jobId, index, mediaQuery, text);
            }}
            onPreviewScene={(idx) => {
              setFocusSceneIndex(idx);
              setActiveTab('preview');
            }}
            selectedScenes={selectedSceneIndices}
            onToggleSceneSelection={handleToggleSceneSelection}
          />
        </div>
        )}
        {activeTab === 'script' && !spec && (
          <div className="bg-surface-container border border-border-tech rounded-xl p-8 text-center">
            <FileText size={32} className="mx-auto text-text-secondary/30 mb-3" />
            <p className="text-text-secondary">
              El guión estará disponible cuando el pipeline complete.
            </p>
            <p className="text-text-secondary/50 text-sm mt-1">
              Estado actual: {selectedJob.status}
            </p>
          </div>
        )}
        {activeTab === 'preview' && spec && (
          <ErrorBoundary>
            <PreviewPlayer
              spec={spec}
              jobId={jobId}
              isReadyToRender={isReadyToRender}
              aspectRatio={spec.aspect_ratio}
              focusSceneIndex={focusSceneIndex}
              onClearFocus={() => setFocusSceneIndex(null)}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'export' && (
          <ExportPanel
            spec={spec}
            jobId={jobId || ''}
            isReadyToRender={isReadyToRender}
            renderLoading={renderLoading}
            exportLoading={exportLoading}
            onRender={handleRender}
            onAEExport={handleAEExport}
            onRegenerateAE={handleRegenerateAE}
            onSpecDownload={handleSpecDownload}
          />
        )}
      </div>
    </div>
  );
}

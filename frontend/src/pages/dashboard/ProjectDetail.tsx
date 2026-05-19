import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, FileText } from 'lucide-react';
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
  const { selectedJob, selectedJobLoading, selectJob, triggerRender, triggerAEExport, regenerateAEExport, startPolling, stopPolling } =
    useJobsStore();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<TabKey>('script');
  const [exportLoading, setExportLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [focusSceneIndex, setFocusSceneIndex] = useState<number | null>(null);

  const defaultName = `Proyecto ${jobId?.slice(0, 8) ?? ''}`;
  const [projectName, setProjectName] = useState(defaultName);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (selectedJob) {
      const name = (selectedJob as Record<string, unknown>).name as string | undefined;
      if (name) {
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
      await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
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
  }, [jobId, triggerRender]);

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
          `http://localhost:8000/api/jobs/${jobId}/export/after-effects/status`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'completed') {
            const downloadRes = await fetch(
              `http://localhost:8000/api/jobs/${jobId}/export/after-effects/download`,
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
  }, [jobId, triggerAEExport]);

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
          `http://localhost:8000/api/jobs/${jobId}/export/after-effects/status`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status === 'completed') {
            const downloadRes = await fetch(
              `http://localhost:8000/api/jobs/${jobId}/export/after-effects/download`,
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
  }, [jobId, regenerateAEExport]);

  const handleSpecDownload = useCallback(async () => {
    if (!jobId) return;
    const token = localStorage.getItem('animaflow_token');
    const response = await fetch(
      `http://localhost:8000/api/jobs/${jobId}/export/spec-json`,
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
  }, [jobId]);

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
        isEditing={isEditingName}
        onStartEdit={() => setIsEditingName(true)}
        onSaveName={handleSaveName}
        onCancelEdit={handleCancelEdit}
        onNameChange={setProjectName}
        onNavigateBack={() => navigate('/dashboard')}
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
          <SceneTimeline
            spec={spec}
            onRegenerateScene={async (index, mediaQuery, text) => {
              await useJobsStore.getState().regenerateScene(jobId, index, mediaQuery, text);
            }}
            onPreviewScene={(idx) => {
              setFocusSceneIndex(idx);
              setActiveTab('preview');
            }}
          />
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
          <PreviewPlayer
            spec={spec}
            aspectRatio={spec.aspect_ratio}
            focusSceneIndex={focusSceneIndex}
            onClearFocus={() => setFocusSceneIndex(null)}
          />
        )}
        {activeTab === 'export' && (
          <ExportPanel
            spec={spec}
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

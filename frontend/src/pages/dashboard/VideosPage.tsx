import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Download,
  Search,
  Film,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileCode,
  X,
} from 'lucide-react';
import { useJobsStore } from '../../store/useJobsStore';
import { useToastStore } from '../../store/useToastStore';
import { useWizardStore } from '../../store/useWizardStore';
import {
  isProcessingStatus,
  isRenderStatus,
  isCompletedStatus,
  isFailedStatus,
} from '../../types/job';
import { JobCardSkeleton } from '../../components/dashboard/JobCardSkeleton';
import type { JobSummary } from '../../types/job';
import { apiFetch, API_BASE } from '../../api/client';
import { PreviewPlayer } from '../../components/PreviewPlayer';

type FilterType = 'all' | 'completed' | 'rendering' | 'failed';

export function VideosPage() {
  const navigate = useNavigate();
  const { jobs, jobsLoading, jobsError, fetchJobs, selectedJob, selectedJobLoading } = useJobsStore();
  const { addToast } = useToastStore();
  const { resetWizard } = useWizardStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [previewJob, setPreviewJob] = useState<JobSummary | null>(null);
  const [interactivePreviewJobId, setInteractivePreviewJobId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchJobDetailForPreview = async (jobId: string) => {
    await useJobsStore.getState().selectJob(jobId);
  };

  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Filter by status
    if (filter === 'completed') {
      result = result.filter((j) => isCompletedStatus(j.status));
    } else if (filter === 'rendering') {
      result = result.filter(
        (j) => isProcessingStatus(j.status) || isRenderStatus(j.status),
      );
    } else if (filter === 'failed') {
      result = result.filter((j) => isFailedStatus(j.status));
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((j) =>
        j.script_text?.toLowerCase().includes(q),
      );
    }

    // Sort by newest first
    return result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [jobs, filter, search]);

  const counts = useMemo(() => {
    return {
      all: jobs.length,
      completed: jobs.filter((j) => isCompletedStatus(j.status)).length,
      rendering: jobs.filter(
        (j) => isProcessingStatus(j.status) || isRenderStatus(j.status),
      ).length,
      failed: jobs.filter((j) => isFailedStatus(j.status)).length,
    };
  }, [jobs]);

  const handleDownloadMP4 = async (jobId: string, videoUrl: string) => {
    setDownloading(jobId);
    try {
      const token = localStorage.getItem('animaflow_token');
      const res = await fetch(`${API_BASE}${videoUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animaflow_${jobId}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error descargando MP4';
      addToast('error', `Error descargando MP4: ${message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAE = async (jobId: string) => {
    setDownloading(jobId);
    try {
      await apiFetch(`/api/jobs/${jobId}/export/after-effects`, {
        method: 'POST',
      });
      // Poll for completion
      let status = 'generating';
      let attempts = 0;
      while (status === 'generating' && attempts < 120) {
        await new Promise((r) => setTimeout(r, 5000));
        const jobData = await apiFetch<{ result_spec: { _ae_export_status?: string; _ae_export_filename?: string } }>(`/api/jobs/${jobId}`);
        status = jobData.result_spec?._ae_export_status || 'generating';
        attempts++;
      }
      if (status === 'completed') {
        const jobData = await apiFetch<{ result_spec: { _ae_export_filename?: string } }>(`/api/jobs/${jobId}`);
        const zipPath = jobData.result_spec?._ae_export_filename;
        if (zipPath) {
          const token = localStorage.getItem('animaflow_token');
          const res = await fetch(
            `${API_BASE}/api/jobs/${jobId}/export/after-effects/download`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipPath;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error descargando exportación AE';
      addToast('error', `Error descargando AE: ${message}`);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Hace minutos';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    if (isCompletedStatus(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={12} />
          Listo
        </span>
      );
    }
    if (isFailedStatus(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle size={12} />
          Fallido
        </span>
      );
    }
    if (isRenderStatus(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Loader2 size={12} className="animate-spin" />
          Renderizando
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Clock size={12} />
        Procesando
      </span>
    );
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'completed', label: 'Completados' },
    { key: 'rendering', label: 'Renderizando' },
    { key: 'failed', label: 'Fallidos' },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-mint-precision/10 flex items-center justify-center">
            <Film size={20} className="text-mint-precision" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">
              Videos
            </h1>
            <p className="text-text-secondary text-sm">
              {counts.completed} completados · {counts.rendering} en proceso ·{' '}
              {counts.failed} fallidos
            </p>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-high border border-transparent'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-60">
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40"
          />
          <input
            type="text"
            placeholder="Buscar por guion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-high border border-border-tech rounded-lg text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-mint-precision/40 transition-colors"
          />
        </div>
      </div>

      {/* Loading — skeleton grid to prevent flash of empty state */}
      {jobsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {jobsError && !jobsLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
            <p className="text-text-secondary">{jobsError}</p>
            <button
              onClick={fetchJobs}
              className="mt-3 px-4 py-2 bg-surface-highest text-text-primary rounded-lg text-sm hover:bg-surface-container transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Empty state — only show when not loading and no jobs */}
      {!jobsLoading && !jobsError && jobs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-container border border-border-tech flex items-center justify-center mb-4">
            <Film size={28} className="text-text-secondary/30" />
          </div>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-1">
            {search ? 'Sin resultados' : 'No hay videos aún'}
          </h3>
          <p className="text-text-secondary text-sm max-w-sm mb-6">
            {search
              ? 'Ningún video coincide con tu búsqueda.'
              : 'Crea tu primer proyecto para generar videos animados.'}
          </p>
          {!search && (
            <button
              onClick={() => {
                resetWizard();
                navigate('/dashboard/new');
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-mint-precision text-surface-container rounded-lg text-sm font-semibold hover:bg-mint-precision/90 transition-colors"
            >
              Crear Proyecto
            </button>
          )}
        </motion.div>
      )}

      {/* Video Grid — only show when not loading and jobs exist */}
      {!jobsLoading && jobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredJobs.map((job, i) => (
            <motion.div
              key={job.job_id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-surface-high border border-border-tech rounded-xl overflow-hidden hover:border-mint-precision/30 transition-all"
            >
              {/* Thumbnail — video frame as cover */}
              <div
                className="relative aspect-video bg-surface-container cursor-pointer overflow-hidden"
                onClick={() => {
                  // All card clicks open the preview modal — never navigate away
                  if (isCompletedStatus(job.status) && job.video_url) {
                    setPreviewJob(job);
                  } else {
                    setInteractivePreviewJobId(job.job_id);
                    fetchJobDetailForPreview(job.job_id);
                  }
                }}
              >
                {job.video_url ? (
                  <>
                    <video
                      src={
                        job.video_url.startsWith('http')
                          ? job.video_url
                          : `${API_BASE}${job.video_url}`
                      }
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      onLoadedData={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.currentTime = Math.min(1, video.duration * 0.1);
                        video.pause();
                      }}
                      onSeeked={(e) => {
                        const video = e.target as HTMLVideoElement;
                        video.pause();
                      }}
                    />
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-mint-precision/20 group-hover:border-mint-precision/40 transition-all">
                        <Play size={20} className="text-white/80 group-hover:text-mint-precision fill-white/80 group-hover:fill-mint-precision transition-colors ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Fallback for no video */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-surface-container" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                        <Play size={20} className="text-white/60 ml-0.5" />
                      </div>
                      <span className="text-[10px] text-text-secondary/40 font-mono uppercase tracking-wider">
                        {job.aspect_ratio || '9:16'}
                      </span>
                    </div>
                  </>
                )}

                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  {getStatusBadge(job.status)}
                </div>

                {/* Aspect ratio badge */}
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-white/80 backdrop-blur-sm">
                    {job.aspect_ratio || '9:16'}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm text-text-primary font-medium line-clamp-2 mb-2">
                  {job.script_text?.slice(0, 80)}
                  {(job.script_text?.length || 0) > 80 ? '...' : ''}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-secondary/50">
                    {formatDate(job.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isCompletedStatus(job.status) && job.video_url && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadMP4(job.job_id, job.video_url!);
                        }}
                        disabled={downloading === job.job_id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface-highest text-text-secondary rounded-lg text-xs font-medium hover:text-text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
                      >
                        {downloading === job.job_id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        MP4
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAE(job.job_id);
                        }}
                        disabled={downloading === job.job_id}
                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface-highest text-text-secondary rounded-lg text-xs font-medium hover:text-text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
                      >
                        <FileCode size={12} />
                      </button>
                    </>
                  )}
                  {isCompletedStatus(job.status) && !job.video_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAE(job.job_id);
                      }}
                      disabled={downloading === job.job_id}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface-highest text-text-secondary rounded-lg text-xs font-medium hover:text-text-primary hover:bg-surface-container transition-colors disabled:opacity-50"
                    >
                      <FileCode size={12} />
                      AE
                    </button>
                  )}
                </div>
                </div>
              </motion.div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {(previewJob || interactivePreviewJobId) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setPreviewJob(null);
              setInteractivePreviewJobId(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-surface-highest rounded-2xl overflow-hidden border border-border-tech relative">
                {/* Close button */}
                <button
                  onClick={() => {
                    setPreviewJob(null);
                    setInteractivePreviewJobId(null);
                  }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
                >
                  <X size={18} />
                </button>

                {/* Content area */}
                <div className="flex flex-col items-center">
                  {/* Case 1: Direct video preview (has video_url) */}
                  {previewJob?.video_url && (
                    <>
                      <video
                        src={
                          previewJob.video_url.startsWith('http')
                            ? previewJob.video_url
                            : `${API_BASE}${previewJob.video_url}`
                        }
                        className="w-full max-h-[70vh] object-contain bg-black"
                        controls
                        autoPlay
                      />
                      <div className="p-4 w-full">
                        <p className="text-sm text-text-primary font-medium line-clamp-2 mb-1">
                          {previewJob.script_text}
                        </p>
                        <p className="text-xs text-text-secondary/50">
                          {previewJob.aspect_ratio || '9:16'} · {formatDate(previewJob.created_at)}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Case 2: Interactive preview (Remotion or loading or no preview) */}
                  {interactivePreviewJobId && !previewJob && (
                    <div className="w-full p-6">
                      {selectedJobLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <Loader2 size={32} className="animate-spin text-mint-precision" />
                          <p className="text-sm text-text-secondary">Cargando preview...</p>
                        </div>
                      ) : selectedJob?.result_spec ? (
                        <div className="flex flex-col items-center gap-4">
                          <PreviewPlayer
                            spec={selectedJob.result_spec}
                            aspectRatio={
                              jobs.find((j) => j.job_id === interactivePreviewJobId)?.aspect_ratio || '9:16'
                            }
                          />
                          <div className="w-full text-center">
                            <p className="text-sm text-text-primary font-medium line-clamp-2 mb-1">
                              {jobs.find((j) => j.job_id === interactivePreviewJobId)?.script_text || ''}
                            </p>
                            <p className="text-xs text-text-secondary/50">
                              {jobs.find((j) => j.job_id === interactivePreviewJobId)?.aspect_ratio || '9:16'} ·{' '}
                              {formatDate(
                                jobs.find((j) => j.job_id === interactivePreviewJobId)?.created_at || '',
                              )}
                            </p>
                          </div>
                        </div>
                      ) : selectedJob?.video_url ? (
                        // Fallback: job has video_url from detail fetch
                        <video
                          src={
                            selectedJob.video_url.startsWith('http')
                              ? selectedJob.video_url
                              : `${API_BASE}${selectedJob.video_url}`
                          }
                          className="w-full max-h-[70vh] object-contain bg-black"
                          controls
                          autoPlay
                        />
                      ) : (
                        // No preview available
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <Film size={48} className="text-text-secondary/30" />
                          {isFailedStatus(selectedJob?.status || '') ? (
                            <>
                              <p className="text-sm text-red-400 text-center max-w-xs">
                                Este proyecto falló durante el renderizado.
                              </p>
                              {selectedJob?.error_message && (
                                <p className="text-xs text-text-secondary/50 text-center max-w-sm font-mono bg-surface-lowest p-3 rounded-lg">
                                  {selectedJob.error_message}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-text-secondary text-center max-w-xs">
                                Este proyecto aún está en proceso. El preview estará disponible cuando se complete el renderizado.
                              </p>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(selectedJob?.status || '')}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

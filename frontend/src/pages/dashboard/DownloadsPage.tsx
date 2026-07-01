import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Eye, FileJson, FileArchive, Film, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobsStore } from '../../store/useJobsStore';
import { useMediaStore } from '../../store/useMediaStore';
import { useToastStore } from '../../store/useToastStore';
import { JsonViewer } from '../../components/dashboard/JsonViewer';
import { isCompletedStatus } from '../../types/job';
import type { JobSummary } from '../../types/job';
import { API_BASE } from '../../api/client';

// ---------------------------------------------------------------------------
// localStorage helpers for tracking downloaded jobs
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'animaflow_downloaded_jobs';

const getDownloadedIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const markAsDownloaded = (jobId: string): string[] => {
  const ids = getDownloadedIds();
  if (!ids.includes(jobId)) {
    ids.push(jobId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
  return ids;
};

interface JobFamily {
  rootId: string;
  jobs: JobSummary[];
}

export function DownloadsPage() {
  const { jobs, jobsLoading, fetchJobs } = useJobsStore();
  const { downloadAEExport, downloadSpecJson } = useMediaStore();
  const { addToast } = useToastStore();
  const [search, setSearch] = useState('');
  const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
  const [viewingSpec, setViewingSpec] = useState<Record<string, unknown> | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [downloadedIds, setDownloadedIds] = useState<string[]>(getDownloadedIds);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Show every completed job so finished videos appear here automatically.
  // (Previously this was gated on `downloadedIds`, which only listed files the
  // user had already downloaded once — so freshly rendered videos never showed.)
  const downloadedJobs = jobs.filter((j) => isCompletedStatus(j.status));

  // Filter by search
  const filteredJobs = downloadedJobs.filter(
    (j) =>
      j.script_text.toLowerCase().includes(search.toLowerCase()) ||
      j.job_id.toLowerCase().includes(search.toLowerCase()),
  );

  // Group downloads by project families
  const familiesMap = new Map<string, JobSummary[]>();
  filteredJobs.forEach((job) => {
    const rootId = job.parent_job_id || job.job_id;
    if (!familiesMap.has(rootId)) {
      familiesMap.set(rootId, []);
    }
    familiesMap.get(rootId)!.push(job);
  });

  const jobFamilies: JobFamily[] = Array.from(familiesMap.entries()).map(([rootId, jobs]) => {
    jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rootId, jobs };
  });

  jobFamilies.sort((a, b) => new Date(b.jobs[0].created_at).getTime() - new Date(a.jobs[0].created_at).getTime());

  const handleDownloadAE = useCallback(
    async (jobId: string) => {
      setDownloadingId(jobId);
      try {
        await downloadAEExport(jobId);
        setDownloadedIds(markAsDownloaded(jobId));
        addToast('success', 'Exportación iniciada. Se descargará automáticamente.');
      } catch {
        addToast('error', 'Error al descargar la exportación para After Effects.');
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadAEExport, addToast],
  );

  const handleDownloadSpec = useCallback(
    async (jobId: string) => {
      setDownloadingId(jobId);
      try {
        await downloadSpecJson(jobId);
        setDownloadedIds(markAsDownloaded(jobId));
        addToast('success', 'Descarga de spec.json iniciada');
      } catch {
        addToast('error', 'Error al descargar el spec.json.');
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadSpecJson, addToast],
  );

  const handleViewSpec = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/export/spec-json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setViewingSpec(data);
      setJsonViewerOpen(true);
    } catch {
      addToast('error', 'Error al cargar el spec.json.');
    }
  }, [addToast]);

  const handleDownloadMp4 = useCallback(async (job: JobSummary) => {
    if (!job.video_url) return;
    try {
      const url = job.video_url.startsWith('http')
        ? job.video_url
        : `${API_BASE}${job.video_url}`;
      const token = localStorage.getItem('animaflow_token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `animaflow_${job.job_id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      setDownloadedIds(markAsDownloaded(job.job_id));
    } catch {
      addToast('error', 'Error descargando el video MP4.');
    }
  }, [addToast]);

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-display font-bold text-text-primary inline-flex items-center gap-2">
            <Download size={24} className="text-mint-precision" />
            <span>Descargas</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Historial de exportaciones y archivos descargados.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md mx-auto">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proyecto..."
            className="w-full bg-surface-lowest border border-border-tech rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
          />
        </div>

        {/* Downloads list */}
        {jobsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-mint-precision" />
          </div>
        ) : jobFamilies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-surface-container border border-border-tech flex items-center justify-center mb-6">
              <Download size={36} className="text-text-secondary/30" />
            </div>
            <h2 className="text-xl font-display font-bold text-text-primary mb-2">
              {search ? 'Sin resultados' : 'No hay descargas aún'}
            </h2>
            <p className="text-text-secondary text-sm max-w-sm">
              {search
                ? 'No se encontraron proyectos descargados con ese término de búsqueda.'
                : 'Descarga archivos de proyectos completados y aparecerán aquí.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {jobFamilies.map((family) => {
                const selectedJobId = selectedVariants[family.rootId] || family.jobs[0].job_id;
                const activeJob = family.jobs.find((j) => j.job_id === selectedJobId) || family.jobs[0];
                const mp4Size = estimateMp4Size(activeJob.aspect_ratio || '9:16');
                const aeSize = estimateAeSize(activeJob.script_text);
                const specSize = estimateSpecSize(activeJob.script_text);

                return (
                  <motion.div
                    key={family.rootId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-container border border-border-tech rounded-xl overflow-hidden"
                  >
                    {/* Project header */}
                    <div className="px-5 py-3 border-b border-border-tech/50 bg-surface-lowest/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary truncate max-w-md">
                          Proyecto: {activeJob.script_text.slice(0, 50)}
                          {activeJob.script_text.length > 50 ? '...' : ''}
                        </h3>
                        <p className="text-[11px] text-text-secondary/40 font-mono mt-0.5">
                          {activeJob.job_id.slice(0, 8)} · {formatDate(activeJob.created_at)}
                        </p>
                      </div>
                      
                      {/* Variants Selector */}
                      {family.jobs.length > 1 && (
                        <div className="flex bg-surface-high rounded-lg p-1 shrink-0">
                          {family.jobs.map((job) => (
                            <button
                              key={job.job_id}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [family.rootId]: job.job_id }))}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                selectedJobId === job.job_id
                                  ? 'bg-mint-precision text-deep-slate shadow-sm'
                                  : 'text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              {job.aspect_ratio || '9:16'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Download items */}
                    <div className="divide-y divide-border-tech/30">
                      {/* MP4 */}
                      <div className="px-5 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-surface-high flex items-center justify-center shrink-0">
                          <Film size={18} className="text-mint-precision/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            video_{activeJob.job_id.slice(0, 8)}.mp4
                          </p>
                          <p className="text-[11px] text-text-secondary/40">
                            Renderizado: {formatDate(activeJob.created_at)} ·{' '}
                            {activeJob.aspect_ratio || '9:16'}
                          </p>
                        </div>
                        <span className="text-xs text-text-secondary/50 font-mono shrink-0">
                          {mp4Size}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* El preview/reproducción del video está en la sección Videos; aquí solo se descarga. */}
                          <button
                            onClick={() => handleDownloadMp4(activeJob)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-text-secondary/70 hover:text-text-primary hover:bg-surface-high transition-colors text-xs font-medium"
                            title="Descargar MP4"
                          >
                            <Download size={14} /> Descargar
                          </button>
                        </div>
                      </div>

                      {/* AE Export */}
                      <div className="px-5 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-surface-high flex items-center justify-center shrink-0">
                          <FileArchive size={18} className="text-secondary/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            AE_Project_{activeJob.job_id.slice(0, 8)}.zip
                          </p>
                          <p className="text-[11px] text-text-secondary/40">
                            Exportado: {formatDate(activeJob.created_at)}
                          </p>
                        </div>
                        <span className="text-xs text-text-secondary/50 font-mono shrink-0">
                          {aeSize}
                        </span>
                        <button
                          onClick={() => handleDownloadAE(activeJob.job_id)}
                          disabled={downloadingId === activeJob.job_id}
                          className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors disabled:opacity-40"
                          title="Descargar"
                        >
                          {downloadingId === activeJob.job_id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </div>

                      {/* spec.json */}
                      <div className="px-5 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-surface-high flex items-center justify-center shrink-0">
                          <FileJson size={18} className="text-text-secondary/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">
                            spec_{activeJob.job_id.slice(0, 8)}.json
                          </p>
                          <p className="text-[11px] text-text-secondary/40">
                            Generado: {formatDate(activeJob.created_at)}
                          </p>
                        </div>
                        <span className="text-xs text-text-secondary/50 font-mono shrink-0">
                          {specSize}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleViewSpec(activeJob.job_id)}
                            className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors"
                            title="Ver"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDownloadSpec(activeJob.job_id)}
                            disabled={downloadingId === activeJob.job_id}
                            className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors disabled:opacity-40"
                            title="Descargar"
                          >
                            {downloadingId === activeJob.job_id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* JSON Viewer Modal */}
        <JsonViewer
          isOpen={jsonViewerOpen}
          onClose={() => {
            setJsonViewerOpen(false);
            setViewingSpec(null);
          }}
          data={viewingSpec}
          title="spec.json"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Reciente';
  }
}

function estimateMp4Size(aspectRatio: string): string {
  // 9:16 ~5-15MB, 16:9 ~10-30MB, 1:1 ~8-20MB
  const base = aspectRatio === '16:9' ? 15 : aspectRatio === '1:1' ? 10 : 8;
  return `${base}-${base * 2} MB`;
}

function estimateAeSize(_scriptText: string): string {
  return '2-8 MB';
}

function estimateSpecSize(_scriptText: string): string {
  return '4-12 KB';
}

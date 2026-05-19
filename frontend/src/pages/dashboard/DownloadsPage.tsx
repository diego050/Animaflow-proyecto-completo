import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Eye, Play, FileJson, FileArchive, Film, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobsStore } from '../../store/useJobsStore';
import { useMediaStore } from '../../store/useMediaStore';
import { useToastStore } from '../../store/useToastStore';
import { JsonViewer } from '../../components/dashboard/JsonViewer';
import { isCompletedStatus } from '../../types/job';
import type { JobSummary } from '../../types/job';

interface DownloadGroup {
  job: JobSummary;
  mp4Size: string;
  aeSize: string;
  specSize: string;
}

export function DownloadsPage() {
  const { jobs, jobsLoading, fetchJobs } = useJobsStore();
  const { downloadAEExport, downloadSpecJson } = useMediaStore();
  const { addToast } = useToastStore();
  const [search, setSearch] = useState('');
  const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
  const [viewingSpec, setViewingSpec] = useState<Record<string, unknown> | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Filter to completed jobs only
  const completedJobs = jobs.filter((j) => isCompletedStatus(j.status));

  // Filter by search
  const filteredJobs = completedJobs.filter(
    (j) =>
      j.script_text.toLowerCase().includes(search.toLowerCase()) ||
      j.job_id.toLowerCase().includes(search.toLowerCase()),
  );

  // Group downloads by project
  const downloadGroups: DownloadGroup[] = filteredJobs.map((job) => ({
    job,
    mp4Size: estimateMp4Size(job.script_text),
    aeSize: estimateAeSize(job.script_text),
    specSize: estimateSpecSize(job.script_text),
  }));

  const handleDownloadAE = useCallback(
    async (jobId: string) => {
      setDownloadingId(jobId);
      try {
        await downloadAEExport(jobId);
        addToast('success', 'Exportación iniciada. Se descargará automáticamente.');
      } catch {
        addToast('error', 'Error al descargar la exportación para After Effects.');
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadAEExport],
  );

  const handleDownloadSpec = useCallback(
    async (jobId: string) => {
      setDownloadingId(jobId);
      try {
        await downloadSpecJson(jobId);
        addToast('success', 'Descarga de spec.json iniciada');
      } catch {
        addToast('error', 'Error al descargar el spec.json.');
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadSpecJson],
  );

  const handleViewSpec = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/export/spec-json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setViewingSpec(data);
      setJsonViewerOpen(true);
    } catch {
      addToast('error', 'Error al cargar el spec.json.');
    }
  }, []);

  const handleDownloadMp4 = useCallback((job: JobSummary) => {
    if (job.video_url) {
      window.open(job.video_url, '_blank');
    }
  }, []);

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
        ) : downloadGroups.length === 0 ? (
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
                ? 'No se encontraron proyectos con ese término de búsqueda.'
                : 'Los proyectos completados aparecerán aquí con sus archivos descargables.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {downloadGroups.map((group) => (
                <motion.div
                  key={group.job.job_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container border border-border-tech rounded-xl overflow-hidden"
                >
                  {/* Project header */}
                  <div className="px-5 py-3 border-b border-border-tech/50 bg-surface-lowest/50">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      Proyecto: {group.job.script_text.slice(0, 50)}
                      {group.job.script_text.length > 50 ? '...' : ''}
                    </h3>
                    <p className="text-[11px] text-text-secondary/40 font-mono mt-0.5">
                      {group.job.job_id.slice(0, 8)} · {formatDate(group.job.created_at)}
                    </p>
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
                          video_{group.job.job_id.slice(0, 8)}.mp4
                        </p>
                        <p className="text-[11px] text-text-secondary/40">
                          Renderizado: {formatDate(group.job.created_at)} ·{' '}
                          {group.job.aspect_ratio || '9:16'}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary/50 font-mono shrink-0">
                        {group.mp4Size}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDownloadMp4(group.job)}
                          className="p-2 rounded-lg text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/10 transition-colors"
                          title="Preview"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadMp4(group.job)}
                          className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors"
                          title="Descargar"
                        >
                          <Download size={14} />
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
                          AE_Project_{group.job.job_id.slice(0, 8)}.zip
                        </p>
                        <p className="text-[11px] text-text-secondary/40">
                          Exportado: {formatDate(group.job.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary/50 font-mono shrink-0">
                        {group.aeSize}
                      </span>
                      <button
                        onClick={() => handleDownloadAE(group.job.job_id)}
                        disabled={downloadingId === group.job.job_id}
                        className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors disabled:opacity-40"
                        title="Descargar"
                      >
                        {downloadingId === group.job.job_id ? (
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
                          spec_{group.job.job_id.slice(0, 8)}.json
                        </p>
                        <p className="text-[11px] text-text-secondary/40">
                          Generado: {formatDate(group.job.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary/50 font-mono shrink-0">
                        {group.specSize}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleViewSpec(group.job.job_id)}
                          className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors"
                          title="Ver"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadSpec(group.job.job_id)}
                          disabled={downloadingId === group.job.job_id}
                          className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors disabled:opacity-40"
                          title="Descargar"
                        >
                          {downloadingId === group.job.job_id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
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

function estimateMp4Size(scriptText: string): string {
  // Rough estimate: ~1MB per 100 chars of script for 9:16
  const chars = scriptText.length;
  const mb = Math.max(2, Math.round((chars / 100) * 1.2));
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;
}

function estimateAeSize(scriptText: string): string {
  // AE project is typically smaller than rendered video
  const chars = scriptText.length;
  const mb = Math.max(1, Math.round((chars / 100) * 0.5));
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`;
}

function estimateSpecSize(scriptText: string): string {
  // spec.json is typically a few KB
  const chars = scriptText.length;
  const kb = Math.max(2, Math.round(chars / 50));
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

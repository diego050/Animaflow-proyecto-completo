import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Film } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import type { TimelineSpec } from '../types/spec';

interface JobSummary {
  job_id: string;
  status: string;
  script_text: string;
  video_url: string | null;
  created_at: string | null;
}

interface DashboardProps {
  onSelectJob: (jobId: string, spec: TimelineSpec | null, status: string, videoUrl: string | null, scriptText: string) => void;
  onCreateNew: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectJob, onCreateNew }) => {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error cargando historial de trabajos';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  const handleOpenJob = async (jobId: string, _summaryStatus: string, scriptText: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      onSelectJob(data.job_id, data.result_spec || null, data.status, data.video_url || null, scriptText);
    } catch {
      addToast('error', 'Error al abrir el proyecto.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que deseas eliminar este proyecto de la base de datos?")) return;

    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE"
      });
      fetchJobs();
    } catch {
      addToast('error', 'Error al eliminar el proyecto.');
    }
  };

  const getStatusBadge = (status: string) => {
    const isCompleted = ['completed', 'completed_video', 'queued_render', 'rendering'].includes(status);
    return isCompleted
      ? 'bg-mint-precision/10 text-mint-precision text-[10px] font-bold px-2 py-1 rounded-full border border-mint-precision/20'
      : 'bg-cadmium-orange/10 text-cadmium-orange text-[10px] font-bold px-2 py-1 rounded-full border border-cadmium-orange/20 uppercase';
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-center bg-surface-container p-6 rounded-2xl border border-border-tech shadow-xl">
        <div>
          <h2 className="text-3xl font-display font-bold text-text-primary">Tus Proyectos</h2>
          <p className="text-text-secondary mt-1">Historial de videos generados con AnimaFlow</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-mint-precision/10 flex items-center gap-2"
        >
          <Plus size={16} /> Crear Nuevo Video
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-secondary/50 animate-pulse">Cargando proyectos...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-text-secondary/50">Aún no has generado ningún video. ¡Anímate a crear el primero!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div
              key={job.job_id}
              className="bg-surface-container border border-border-tech rounded-xl overflow-hidden shadow-lg hover:border-mint-precision/40 hover:bg-surface-high transition-all flex flex-col cursor-pointer group"
              onClick={() => handleOpenJob(job.job_id, job.status, job.script_text)}
            >
              <div className="h-32 bg-surface-lowest p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-mint-precision/20 to-cadmium-orange/10 group-hover:opacity-20 transition-opacity" />
                <p className="text-text-primary text-sm italic relative z-10 line-clamp-4">&ldquo;{job.script_text}&rdquo;</p>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary/40 font-mono" title={job.job_id}>ID: {job.job_id.split('-')[0]}</span>
                  <span className={getStatusBadge(job.status)}>
                    {job.status === 'completed' || job.status === 'completed_video' ? 'COMPLETADO' : job.status}
                  </span>
                </div>

                <div className="mt-auto pt-4 flex justify-between items-center text-xs">
                  <span className="text-text-secondary/50">{job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Reciente'}</span>
                  <div className="flex gap-4 items-center">
                    <button
                      onClick={(e) => handleDelete(e, job.job_id)}
                      className="flex items-center gap-1 text-text-secondary/50 hover:text-error transition-colors"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                    <span className="text-mint-precision/70 group-hover:text-mint-precision font-semibold transition-colors">
                      Abrir →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

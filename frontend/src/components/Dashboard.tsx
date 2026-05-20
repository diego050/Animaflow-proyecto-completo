import React, { useEffect, useState, useCallback } from 'react';
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
      const res = await fetch('http://localhost:8000/api/jobs');
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
      const res = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
      const data = await res.json();
      onSelectJob(data.job_id, data.result_spec || null, data.status, data.video_url || null, scriptText);
    } catch {
      addToast('error', 'Error al abrir el proyecto.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation(); // Evitar abrir el proyecto al hacer clic en borrar
    if (!confirm("¿Seguro que deseas eliminar este proyecto de la base de datos?")) return;

    try {
      await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
        method: "DELETE"
      });
      fetchJobs(); // Recargar la lista
    } catch {
      addToast('error', 'Error al eliminar el proyecto.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">Tus Proyectos</h2>
          <p className="text-slate-400 mt-1">Historial de videos generados con AnimaFlow</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
        >
          <span>+</span> Crear Nuevo Video
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 animate-pulse">Cargando proyectos...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-slate-500">Aún no has generado ningún video. ¡Anímate a crear el primero!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div key={job.job_id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-600 transition-all flex flex-col cursor-pointer group" onClick={() => handleOpenJob(job.job_id, job.status, job.script_text)}>
              <div className="h-32 bg-slate-950 p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-blue-500 to-emerald-500 group-hover:opacity-40 transition-opacity"></div>
                <p className="text-slate-300 text-sm italic relative z-10 line-clamp-4">"{job.script_text}"</p>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-mono" title={job.job_id}>ID: {job.job_id.split('-')[0]}</span>
                  {job.status === "completed" || job.status === "queued_render" || job.status === "rendering" ? (
                     <span className="bg-emerald-900/50 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-800">COMPLETADO</span>
                  ) : (
                     <span className="bg-amber-900/50 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-800 uppercase">{job.status}</span>
                  )}
                </div>
                
                <div className="mt-auto pt-4 flex justify-between items-center text-xs">
                   <span className="text-slate-500">{job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Reciente'}</span>
                   <div className="flex gap-4 items-center">
                     <button onClick={(e) => handleDelete(e, job.job_id)} className="text-red-500 hover:text-red-400 font-semibold transition-colors">🗑️ Borrar</button>
                     <button className="text-blue-400 group-hover:text-blue-300 font-semibold transition-colors">Abrir →</button>
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

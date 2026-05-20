import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useJobsStore } from '../../store/useJobsStore';
import { useToastStore } from '../../store/useToastStore';
import { ProjectCard } from '../../components/dashboard/ProjectCard';

export function ProjectsList() {
  const navigate = useNavigate();
  const {
    jobs,
    jobsLoading,
    jobsError,
    fetchJobs,
    deleteJob,
  } = useJobsStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleDelete = useCallback(
    async (jobId: string) => {
      if (!confirm('¿Seguro que deseas eliminar este proyecto?')) return;
      try {
        await deleteJob(jobId);
        addToast('success', 'Proyecto eliminado correctamente');
      } catch {
        addToast('error', 'Error al eliminar el proyecto.');
      }
    },
    [deleteJob, addToast],
  );

  if (jobsLoading && jobs.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">Proyectos</h1>
            <p className="text-text-secondary text-sm mt-1">
              Gestiona tus videos generados con AnimaFlow
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (jobsError && jobs.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <p className="text-error font-medium">Error al cargar proyectos</p>
          <p className="text-text-secondary text-sm mt-1">{jobsError}</p>
          <button
            onClick={() => fetchJobs()}
            className="mt-4 px-4 py-2 bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Proyectos</h1>
          <p className="text-text-secondary text-sm mt-1">
            {jobs.length} {jobs.length === 1 ? 'proyecto' : 'proyectos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchJobs()}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors"
            title="Refrescar"
          >
            <RefreshCw size={18} className={jobsLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/dashboard/new')}
            className="flex items-center gap-2 px-4 py-2 bg-mint-precision text-deep-slate rounded-lg text-sm font-semibold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_12px_rgba(0,255,171,0.15)]"
          >
            <Plus size={16} />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Grid */}
      {jobs.length === 0 ? (
        <EmptyState onCreateNew={() => navigate('/dashboard/new')} />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          layout
        >
          {jobs.map((job) => (
            <ProjectCard
              key={job.job_id}
              job={job}
              onDelete={handleDelete}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-surface-container border border-border-tech rounded-xl overflow-hidden animate-pulse">
      <div className="h-28 bg-surface-lowest" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-24 bg-surface-high rounded-full" />
          <div className="h-4 w-16 bg-surface-high rounded" />
        </div>
        <div className="h-4 w-full bg-surface-high rounded" />
        <div className="h-4 w-2/3 bg-surface-high rounded" />
        <div className="pt-3 border-t border-border-tech/50 flex justify-between">
          <div className="h-4 w-20 bg-surface-high rounded" />
          <div className="h-6 w-16 bg-surface-high rounded" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-surface-container border border-border-tech flex items-center justify-center mb-6">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-mint-precision"
        >
          <rect x="2" y="2" width="20" height="20" rx="4" />
          <circle cx="12" cy="12" r="3" />
          <line x1="2" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="22" y2="12" />
        </svg>
      </div>
      <h2 className="text-xl font-display font-bold text-text-primary mb-2">
        No tienes proyectos aún
      </h2>
      <p className="text-text-secondary text-sm max-w-sm mb-6">
        Crea tu primer video con AnimaFlow. La IA generará el guión, las escenas y el video final.
      </p>
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-lg text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)]"
      >
        <Plus size={16} />
        Crear primer proyecto
      </button>
    </motion.div>
  );
}

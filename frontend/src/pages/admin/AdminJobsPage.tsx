import { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { Loader2, Search, MoreVertical, RefreshCw, XCircle, Trash2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  segmenting: 'text-blue-400 bg-blue-400/10',
  visuals_generating: 'text-purple-400 bg-purple-400/10',
  processing_scenes: 'text-purple-400 bg-purple-400/10',
  queued_render: 'text-orange-400 bg-orange-400/10',
  rendering: 'text-orange-400 bg-orange-400/10',
  completed: 'text-emerald-400 bg-emerald-400/10',
  completed_video: 'text-emerald-400 bg-emerald-400/10',
  failed: 'text-red-400 bg-red-400/10',
  failed_render: 'text-red-400 bg-red-400/10',
  cancelled: 'text-gray-400 bg-gray-400/10',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  segmenting: 'Segmentando',
  visuals_generating: 'Generando visuales',
  processing_scenes: 'Procesando escenas',
  queued_render: 'En cola de render',
  rendering: 'Renderizando',
  completed: 'Completado',
  completed_video: 'Video listo',
  failed: 'Fallido',
  failed_render: 'Render fallido',
  cancelled: 'Cancelado',
};

export function AdminJobsPage() {
  const {
    jobs,
    jobsLoading,
    jobsTotal,
    jobsPage,
    fetchJobs,
    retryJob,
    cancelJob,
    deleteJob,
  } = useAdminStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [detailJob, setDetailJob] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs(1, statusFilter);
  }, [fetchJobs, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(1, statusFilter);
  };

  const filteredJobs = search
    ? jobs?.filter(
        (j) =>
          j.user_email?.toLowerCase().includes(search.toLowerCase()) ||
          j.job_id?.toLowerCase().includes(search.toLowerCase()) ||
          j.script_text?.toLowerCase().includes(search.toLowerCase()),
      )
    : jobs;

  const handleRetry = async (jobId: string) => {
    await retryJob(jobId);
    setMenuOpen(null);
  };

  const handleCancel = async (jobId: string) => {
    await cancelJob(jobId);
    setMenuOpen(null);
  };

  const handleDelete = async (jobId: string) => {
    if (window.confirm('¿Eliminar este job permanentemente?')) {
      await deleteJob(jobId);
      setMenuOpen(null);
    }
  };

  const selectedJob = jobs?.find((j) => j.job_id === detailJob);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-100">Gestión de Jobs</h1>
        <p className="text-gray-400 mt-1">{jobsTotal ?? 0} jobs en total</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por job_id, email o script..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {jobsLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={32} className="animate-spin text-violet-400" />
        </div>
      ) : filteredJobs?.length === 0 ? (
        <div className="text-center text-gray-500 py-12 bg-gray-900 border border-gray-800 rounded-xl">
          No se encontraron jobs.
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Job ID</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Usuario</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Ratio</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Creado</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs?.map((job) => {
                  const statusColor = statusColors[job.status] || 'text-gray-400 bg-gray-700';
                  const statusLabel = statusLabels[job.status] || job.status;
                  return (
                    <tr key={job.job_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                          {job.job_id.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                        {job.user_email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                        {job.aspect_ratio}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                        {new Date(job.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setMenuOpen(menuOpen === job.job_id ? null : job.job_id)}
                          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-100 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {menuOpen === job.job_id && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="fixed w-48 rounded-lg shadow-xl py-1 z-50"
                              style={{
                                backgroundColor: '#1E293B',
                                border: '1px solid #334155',
                                right: '20px',
                                top: 'auto',
                                marginTop: '8px'
                              }}
                            >
                              <button
                                onClick={() => setDetailJob(job.job_id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                              >
                                <Eye size={14} />
                                Ver detalles
                              </button>
                              {job.status.includes('failed') && (
                                <button
                                  onClick={() => handleRetry(job.job_id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                  <RefreshCw size={14} />
                                  Reintentar
                                </button>
                              )}
                              {!['completed', 'completed_video', 'failed', 'cancelled'].includes(job.status) && (
                                <button
                                  onClick={() => handleCancel(job.job_id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                                >
                                  <XCircle size={14} />
                                  Cancelar
                                </button>
                              )}
                              <div className="my-1 border-t border-gray-700" />
                              <button
                                onClick={() => handleDelete(job.job_id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                              >
                                <Trash2 size={14} />
                                Eliminar
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {jobsTotal > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Mostrando {(jobsPage - 1) * 20 + 1}-{Math.min(jobsPage * 20, jobsTotal)} de {jobsTotal}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchJobs(jobsPage - 1, statusFilter)}
                  disabled={jobsPage <= 1}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => fetchJobs(jobsPage + 1, statusFilter)}
                  disabled={jobsPage * 20 >= jobsTotal}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg"
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Detalles del Job</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Job ID</span>
                  <code className="text-gray-300 text-xs">{selectedJob.job_id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Usuario</span>
                  <span className="text-gray-300">{selectedJob.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado</span>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${statusColors[selectedJob.status]}`}>
                    {statusLabels[selectedJob.status]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Aspect Ratio</span>
                  <span className="text-gray-300">{selectedJob.aspect_ratio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Creado</span>
                  <span className="text-gray-300">{new Date(selectedJob.created_at).toLocaleString('es-ES')}</span>
                </div>
                {selectedJob.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completado</span>
                    <span className="text-gray-300">{new Date(selectedJob.completed_at).toLocaleString('es-ES')}</span>
                  </div>
                )}
                {selectedJob.error_message && (
                  <div>
                    <span className="text-gray-500 block mb-1">Error</span>
                    <p className="text-red-400 text-xs bg-red-400/10 p-2 rounded">{selectedJob.error_message}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block mb-1">Script</span>
                  <p className="text-gray-300 text-xs bg-gray-800 p-2 rounded max-h-24 overflow-y-auto">
                    {selectedJob.script_text.slice(0, 500)}
                    {selectedJob.script_text.length > 500 ? '...' : ''}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setDetailJob(null)}
                  className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

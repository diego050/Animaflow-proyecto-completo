import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import type { JobSummary } from '../../types/job';

interface ProjectCardProps {
  job: JobSummary;
  onDelete: (jobId: string) => void;
}

export function ProjectCard({ job, onDelete }: ProjectCardProps) {
  const formattedDate = formatDate(job.created_at);
  const aspectRatio = job.aspect_ratio || '9:16';

  return (
    <Link to={`/dashboard/project/${job.job_id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group bg-surface-container border border-border-tech rounded-xl overflow-hidden hover:border-mint-precision/40 hover:bg-surface-high transition-all duration-200 cursor-pointer flex flex-col"
      >
        {/* Preview area */}
        <div className="h-28 bg-surface-lowest p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-mint-precision/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-text-secondary/70 text-xs italic relative z-10 line-clamp-3">
            &ldquo;{job.script_text}&rdquo;
          </p>
        </div>

        {/* Info area */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex justify-between items-start">
            <StatusBadge status={job.status} />
            <span className="text-[10px] text-text-secondary/40 font-mono" title={job.job_id}>
              {job.job_id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border-tech/50">
            <span className="text-xs text-text-secondary/50">{formattedDate}</span>
            <span className="text-[10px] text-text-secondary/30 bg-surface-high px-1.5 py-0.5 rounded">
              {aspectRatio}
            </span>

            <div className="ml-auto">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(job.job_id);
                }}
                className="p-1.5 rounded-md text-text-secondary/50 hover:text-error hover:bg-error/10 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

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

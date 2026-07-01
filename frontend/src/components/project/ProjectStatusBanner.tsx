import { motion } from 'framer-motion';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { ProgressSteps } from '../../components/dashboard/ProgressSteps';

interface ProjectStatusBannerProps {
  status: string;
  isProcessing: boolean;
  isRendering: boolean;
  isFailed: boolean;
  errorMessage?: string;
  jobId?: string;
  onRetry?: () => void;
}

export function ProjectStatusBanner({
  status,
  isProcessing,
  isRendering,
  isFailed,
  errorMessage,
  jobId,
  onRetry,
}: ProjectStatusBannerProps) {
  return (
    <>
      {(isProcessing || isRendering) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 bg-surface-container border border-border-tech rounded-xl p-4"
        >
          <h3 className="text-xs font-semibold text-text-secondary/70 mb-3">
            Progreso del pipeline
          </h3>
          <ProgressSteps status={status} compact />
        </motion.div>
      )}

      {isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-error/10 border border-error/20 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-error font-semibold">
                {status === 'failed_render'
                  ? 'Error durante el renderizado'
                  : 'Error en el procesamiento'}
              </p>
              <p className="text-text-secondary text-sm mt-1">
                {errorMessage || 'El pipeline falló. Puedes reintentar desde el punto donde falló.'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-cadmium-orange/10 text-cadmium-orange 
                             border border-cadmium-orange/30 rounded-lg hover:bg-cadmium-orange/20 
                             transition-colors duration-150 text-sm font-medium"
                >
                  <RotateCw size={16} />
                  Reintentar
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

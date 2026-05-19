import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ProgressSteps } from '../../components/dashboard/ProgressSteps';

interface ProjectStatusBannerProps {
  status: string;
  isProcessing: boolean;
  isRendering: boolean;
  isFailed: boolean;
  errorMessage?: string;
}

export function ProjectStatusBanner({
  status,
  isProcessing,
  isRendering,
  isFailed,
  errorMessage,
}: ProjectStatusBannerProps) {
  return (
    <>
      {(isProcessing || isRendering) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 bg-surface-container border border-border-tech rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Progreso del pipeline
          </h3>
          <ProgressSteps status={status} />
        </motion.div>
      )}

      {isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-error/10 border border-error/20 rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-error" />
            <div>
              <p className="text-error font-semibold">
                {status === 'failed_render'
                  ? 'Error durante el renderizado'
                  : 'Error en el procesamiento'}
              </p>
              <p className="text-text-secondary text-sm mt-1">
                {errorMessage || 'El pipeline falló. Intenta eliminar y crear un nuevo proyecto.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

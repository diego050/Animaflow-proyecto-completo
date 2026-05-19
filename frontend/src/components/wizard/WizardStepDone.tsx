import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export interface WizardStepDoneProps {
  projectId?: string;
  onViewProject: (projectId: string) => void;
  onCreateAnother: () => void;
}

export function WizardStepDone({
  projectId,
  onViewProject,
  onCreateAnother,
}: WizardStepDoneProps) {
  return (
    <div className="space-y-6 text-center py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-mint-precision/10 border-2 border-mint-precision flex items-center justify-center mx-auto"
      >
        <CheckCircle2 size={40} className="text-mint-precision" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-display font-bold text-text-primary mb-2">
          ¡Proyecto completado!
        </h2>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Tu video ha sido generado exitosamente. Puedes verlo, editarlo o exportarlo.
        </p>
      </div>

      {projectId && (
        <p className="text-xs text-text-secondary/40 font-mono">
          ID: {projectId}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={() => {
            if (projectId) {
              onViewProject(projectId);
            }
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-lg text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)]"
        >
          Ver Proyecto
        </button>
        <button
          onClick={onCreateAnother}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-surface-highest text-text-primary rounded-lg text-sm font-semibold hover:bg-surface-high transition-colors"
        >
          Crear otro proyecto
        </button>
      </div>
    </div>
  );
}

import { Loader2 } from 'lucide-react';
import { ProgressSteps } from '../dashboard/ProgressSteps';

export interface WizardStepProcessingProps {
  status?: string;
  progress?: number;
}

export function WizardStepProcessing({ status, progress }: WizardStepProcessingProps) {
  const isFailed = status === 'failed' || status === 'failed_render';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Procesando tu proyecto
        </h2>
        <p className="text-text-secondary text-sm">
          La IA está generando las escenas. Esto puede tomar unos minutos.
        </p>
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-6">
        {status ? (
          <ProgressSteps status={status} />
        ) : (
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 size={20} className="animate-spin" />
            <span>Conectando con el servidor...</span>
          </div>
        )}
      </div>

      {isFailed && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-center">
          <p className="text-error font-semibold">El procesamiento falló</p>
          <p className="text-text-secondary text-sm mt-1">
            Intenta crear un nuevo proyecto con un guión diferente.
          </p>
        </div>
      )}
    </div>
  );
}

import { Loader2, Terminal } from 'lucide-react';
import { ProgressSteps } from '../dashboard/ProgressSteps';
import { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';

export interface WizardStepProcessingProps {
  status?: string;
  progress?: number;
  jobId?: string;
  title?: string;
  description?: string;
}

interface LogMessage {
  timestamp?: string;
  level?: string;
  message?: string;
}

export function WizardStepProcessing({ status, jobId, title, description }: WizardStepProcessingProps) {
  const isFailed = status === 'failed' || status === 'failed_render';
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId || isFailed || status === 'completed') return;

    const fetchLogs = async () => {
      try {
        const data = await api.get<{logs: LogMessage[]}>(`/api/jobs/${jobId}/logs`);
        if (data && data.logs) {
          setLogs(data.logs);
        }
      } catch (_e) {
        // Ignore errors
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [jobId, status, isFailed]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          {title || "Procesando tu proyecto"}
        </h2>
        <p className="text-text-secondary text-sm">
          {description || "La IA está generando las escenas. Esto puede tomar unos minutos."}
        </p>
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-6">
        {status ? (
          <ProgressSteps status={status} />
        ) : (
          <div className="flex items-center gap-3 text-text-secondary mb-4">
            <Loader2 size={20} className="animate-spin" />
            <span>Conectando con el servidor...</span>
          </div>
        )}

        {/* Live Logs Terminal */}
        {jobId && (
          <div className="mt-6 border border-border-tech rounded-lg bg-[#0a0f18] overflow-hidden flex flex-col">
            <div className="bg-surface-highest px-3 py-1.5 border-b border-border-tech flex items-center gap-2">
              <Terminal size={14} className="text-mint-precision" />
              <span className="text-xs font-mono text-text-secondary font-medium">Worker Logs</span>
              {status !== 'completed' && !isFailed && (
                <div className="ml-auto flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 rounded-full bg-mint-precision animate-pulse delay-150" />
                </div>
              )}
            </div>
            <div className="p-3 h-48 overflow-y-auto font-mono text-xs space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-text-secondary/50 italic">Esperando eventos...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-text-secondary/50 shrink-0">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                    </span>
                    <span className={log.level === 'ERROR' ? 'text-error' : log.level === 'WARNING' ? 'text-warning' : 'text-text-primary/90'}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
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

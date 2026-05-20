import { useEffect } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { Loader2, Database, Server, Clock, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function AdminSystemPage() {
  const { systemHealth, systemHealthLoading, fetchSystemHealth } = useAdminStore();

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  if (systemHealthLoading && !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="text-center text-gray-400 py-12">
        No se pudo cargar el estado del sistema.
      </div>
    );
  }

  const uptime = formatUptime(systemHealth?.uptime_seconds);
  const lastHeartbeat = systemHealth.last_worker_heartbeat
    ? new Date(systemHealth.last_worker_heartbeat).toLocaleString('es-ES')
    : 'Nunca';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-100">Estado del Sistema</h1>
        <p className="text-gray-400 mt-1">Monitoreo en tiempo real de infraestructura</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ServiceCard
          title="Redis"
          icon={Server}
          connected={systemHealth.redis_connected}
          metrics={[
            { label: 'Cola de jobs', value: String(systemHealth?.redis_queue_length ?? 0) },
          ]}
        />

        <ServiceCard
          title="Base de Datos"
          icon={Database}
          connected={systemHealth.database_connected}
          metrics={[
            { label: 'Pool usado', value: `${systemHealth?.database_pool_used ?? 0}/${systemHealth?.database_pool_size ?? 0}` },
          ]}
        />

        <ServiceCard
          title="Workers"
          icon={Activity}
          connected={systemHealth.workers_active > 0}
          metrics={[
            { label: 'Activos', value: String(systemHealth?.workers_active ?? 0) },
            { label: 'Idle', value: String(systemHealth?.workers_idle ?? 0) },
            { label: 'Último heartbeat', value: lastHeartbeat },
          ]}
        />

        <ServiceCard
          title="Uptime"
          icon={Clock}
          connected={true}
          metrics={[
            { label: 'Tiempo activo', value: uptime },
          ]}
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Diagnóstico</h2>
        <div className="space-y-3">
          <DiagnosticItem
            label="Conexión a Redis"
            status={systemHealth?.redis_connected ?? false}
            detail={systemHealth?.redis_connected ?? false ? 'Conectado correctamente' : 'No se puede conectar a Redis'}
          />
          <DiagnosticItem
            label="Conexión a PostgreSQL"
            status={systemHealth?.database_connected ?? false}
            detail={systemHealth?.database_connected ?? false ? 'Base de datos operativa' : 'Base de datos no disponible'}
          />
          <DiagnosticItem
            label="Workers activos"
            status={(systemHealth?.workers_active ?? 0) > 0}
            detail={
              (systemHealth?.workers_active ?? 0) > 0
                ? `${systemHealth?.workers_active ?? 0} workers procesando jobs`
                : 'No hay workers activos'
            }
          />
          <DiagnosticItem
            label="Cola de Redis"
            status={(systemHealth?.redis_queue_length ?? 0) < 50}
            detail={
              (systemHealth?.redis_queue_length ?? 0) < 50
                ? `${systemHealth?.redis_queue_length ?? 0} jobs en cola (normal)`
                : `${systemHealth?.redis_queue_length ?? 0} jobs en cola (posible bottleneck)`
            }
            warning={(systemHealth?.redis_queue_length ?? 0) >= 50}
          />
          <DiagnosticItem
            label="Pool de conexiones DB"
            status={(systemHealth?.database_pool_used ?? 0) < (systemHealth?.database_pool_size ?? 1) * 0.8}
            detail={`${systemHealth?.database_pool_used ?? 0} de ${systemHealth?.database_pool_size ?? 0} conexiones usadas`}
            warning={(systemHealth?.database_pool_used ?? 0) >= (systemHealth?.database_pool_size ?? 1) * 0.8}
          />
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  icon: Icon,
  connected,
  metrics,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  connected: boolean;
  metrics: { label: string; value: string }[];
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${connected ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon size={20} className={connected ? 'text-emerald-400' : 'text-red-400'} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-100">{title}</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
              {connected ? 'Operativo' : 'Fuera de línea'}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{m.label}</span>
            <span className="text-gray-300 font-medium">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagnosticItem({
  label,
  status,
  detail,
  warning,
}: {
  label: string;
  status: boolean;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3">
      {warning ? (
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
      ) : status ? (
        <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium text-gray-300">{label}</p>
        <p className={`text-xs ${warning ? 'text-amber-400' : 'text-gray-500'}`}>{detail}</p>
      </div>
    </div>
  );
}

function formatUptime(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

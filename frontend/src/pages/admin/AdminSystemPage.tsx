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
        <Loader2 size={32} className="animate-spin" style={{ color: '#00FFAB' }} />
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="text-center py-12" style={{ color: '#c4c6cd' }}>
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
        <h1 className="text-2xl font-display font-bold" style={{ color: '#e4e2e3' }}>Estado del Sistema</h1>
        <p className="mt-1" style={{ color: '#c4c6cd' }}>Monitoreo en tiempo real de infraestructura</p>
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
          connected={systemHealth?.workers_connected ?? false}
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

      <div className="rounded-xl p-6" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#e4e2e3' }}>Diagnóstico</h2>
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
            status={systemHealth?.workers_connected ?? false}
            detail={
              systemHealth?.workers_connected ?? false
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
    <div className="rounded-xl p-5" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: connected ? 'rgba(0,255,171,0.1)' : 'rgba(255,140,0,0.1)' }}>
          <span style={{ color: connected ? '#00FFAB' : '#FF8C00', display: 'inline-flex' }}>
            <Icon size={20} />
          </span>
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: '#e4e2e3' }}>{title}</h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: connected ? '#00FFAB' : '#FF8C00' }} />
            <span className="text-xs" style={{ color: connected ? '#00FFAB' : '#FF8C00' }}>
              {connected ? 'Operativo' : 'Fuera de línea'}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex justify-between text-sm">
            <span style={{ color: '#8e9197' }}>{m.label}</span>
            <span className="font-medium" style={{ color: '#c4c6cd' }}>{m.value}</span>
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
    <div className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: 'rgba(30,41,59,0.5)' }}>
      {warning ? (
        <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#FF8C00' }} />
      ) : status ? (
        <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#00FFAB' }} />
      ) : (
        <XCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#FF8C00' }} />
      )}
      <div>
        <p className="text-sm font-medium" style={{ color: '#c4c6cd' }}>{label}</p>
        <p className="text-xs" style={{ color: warning ? '#FF8C00' : '#8e9197' }}>{detail}</p>
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

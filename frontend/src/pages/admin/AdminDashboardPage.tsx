import { useEffect } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import {
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Loader2,
  HardDrive,
  TrendingUp,
} from 'lucide-react';

export function AdminDashboardPage() {
  const { stats, statsLoading, fetchStats, systemHealth, systemHealthLoading, fetchSystemHealth } = useAdminStore();

  useEffect(() => {
    fetchStats();
    fetchSystemHealth();
  }, [fetchStats, fetchSystemHealth]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-400 py-12">
        No se pudieron cargar las estadísticas.
      </div>
    );
  }

  const statCards = [
    {
      label: 'Usuarios Totales',
      value: stats.total_users ?? 0,
      sub: `${stats.active_users ?? 0} activos`,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Jobs Totales',
      value: stats.total_jobs ?? 0,
      sub: `${stats.pending_jobs ?? 0} pendientes`,
      icon: Briefcase,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Completados',
      value: stats.completed_jobs ?? 0,
      sub: `${(stats.success_rate ?? 0).toFixed(1)}% éxito`,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Fallidos',
      value: stats.failed_jobs ?? 0,
      sub: `${stats.rendering_jobs ?? 0} renderizando`,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Almacenamiento',
      value: `${(stats.total_storage_mb ?? 0).toFixed(0)} MB`,
      sub: `Prom: ${(stats.avg_render_time_seconds ?? 0).toFixed(0)}s render`,
      icon: HardDrive,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Tasa de Éxito',
      value: `${(stats.success_rate ?? 0).toFixed(1)}%`,
      sub: 'Últimos 30 días',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-100">Panel de Administración</h1>
        <p className="text-gray-400 mt-1">Vista general del sistema AnimaFlow</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-100 mt-2">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {systemHealth && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Estado del Sistema</h2>
          {systemHealthLoading ? (
            <Loader2 size={24} className="animate-spin text-violet-400" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <HealthItem
                label="Redis"
                status={systemHealth.redis_connected}
                detail={`${systemHealth.redis_queue_length} en cola`}
              />
              <HealthItem
                label="Base de Datos"
                status={systemHealth.database_connected}
                detail={`${systemHealth.database_pool_used}/${systemHealth.database_pool_size} conexiones`}
              />
              <HealthItem
                label="Workers"
                status={systemHealth.workers_active > 0}
                detail={`${systemHealth.workers_active} activos, ${systemHealth.workers_idle} idle`}
              />
              <HealthItem
                label="Uptime"
                status={true}
                detail={formatUptime(systemHealth.uptime_seconds)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HealthItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
      <div className={`w-2.5 h-2.5 rounded-full ${status ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <div>
        <p className="text-sm font-medium text-gray-300">{label}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

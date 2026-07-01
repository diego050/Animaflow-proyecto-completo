import { useEffect, useState } from 'react';
import { api } from '../../api/client';
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

interface BusinessMetrics {
  users_registered_this_week: number;
  activation_rate: number;
  avg_time_to_first_export_hours: number;
  weekly_retention_rate: number;
  churn_rate: number;
  reactivated_users: number;
  mrr: number;
}

  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);

  useEffect(() => {
    api.get<BusinessMetrics>('/api/admin/metrics').then((data) => {
      setBusinessMetrics(data);
    }).catch(() => {});
  }, []);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin" style={{ color: '#00FFAB' }} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12" style={{ color: '#c4c6cd' }}>
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
      color: 'text-[#b5c8df]',
      bg: 'bg-[#b5c8df]/10',
    },
    {
      label: 'Jobs Totales',
      value: stats.total_jobs ?? 0,
      sub: `${stats.pending_jobs ?? 0} pendientes`,
      icon: Briefcase,
      color: 'text-[#00FFAB]',
      bg: 'bg-[#2C3E50]/10',
    },
    {
      label: 'Completados',
      value: stats.completed_jobs ?? 0,
      sub: `${(stats.success_rate ?? 0).toFixed(1)}% éxito`,
      icon: CheckCircle,
      color: 'text-[#00FFAB]',
      bg: 'bg-[#00FFAB]/10',
    },
    {
      label: 'Fallidos',
      value: stats.failed_jobs ?? 0,
      sub: `${stats.rendering_jobs ?? 0} renderizando`,
      icon: XCircle,
      color: 'text-[#FF8C00]',
      bg: 'bg-[#FF8C00]/10',
    },
    {
      label: 'Almacenamiento',
      value: `${(stats.total_storage_mb ?? 0).toFixed(0)} MB`,
      sub: `Prom: ${(stats.avg_render_time_seconds ?? 0).toFixed(0)}s render`,
      icon: HardDrive,
      color: 'text-[#FF8C00]',
      bg: 'bg-[#FF8C00]/10',
    },
    {
      label: 'Tasa de Éxito',
      value: `${(stats.success_rate ?? 0).toFixed(1)}%`,
      sub: 'Últimos 30 días',
      icon: TrendingUp,
      color: 'text-[#b5c8df]',
      bg: 'bg-[#b5c8df]/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold" style={{ color: '#e4e2e3' }}>Panel de Administración</h1>
        <p className="mt-1" style={{ color: '#c4c6cd' }}>Vista general del sistema AnimaFlow</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl p-5 transition-colors"
              style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: '#8e9197' }}>{card.label}</p>
                  <p className="text-3xl font-bold mt-2" style={{ color: '#e4e2e3' }}>{card.value}</p>
                  <p className="text-xs mt-1" style={{ color: '#8e9197' }}>{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {businessMetrics && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: '#e4e2e3' }}>Métricas de Negocio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BusinessMetricCard
              label="Registros esta semana"
              value={businessMetrics.users_registered_this_week ?? 0}
              color="#00FFAB"
            />
            <BusinessMetricCard
              label="Tasa de Activación"
              value={`${(businessMetrics.activation_rate ?? 0).toFixed(1)}%`}
              color="#00FFAB"
            />
            <BusinessMetricCard
              label="Retención Semanal"
              value={`${(businessMetrics.weekly_retention_rate ?? 0).toFixed(1)}%`}
              color="#FF8C00"
            />
            <BusinessMetricCard
              label="Churn Rate"
              value={`${(businessMetrics.churn_rate ?? 0).toFixed(1)}%`}
              color="#FF8C00"
            />
            <BusinessMetricCard
              label="Usuarios Reactivados"
              value={businessMetrics.reactivated_users ?? 0}
              color="#00FFAB"
            />
            <BusinessMetricCard
              label="MRR"
              value={`$${(businessMetrics.mrr ?? 0).toFixed(2)}`}
              color="#2C3E50"
            />
          </div>
        </div>
      )}

      {systemHealth && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#e4e2e3' }}>Estado del Sistema</h2>
          {systemHealthLoading ? (
            <Loader2 size={24} className="animate-spin" style={{ color: '#00FFAB' }} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <HealthItem
                label="Base de Datos"
                status={systemHealth.database_connected}
                detail={`${systemHealth.database_pool_used}/${systemHealth.database_pool_size} conexiones`}
              />
              <HealthItem
                label="Render-server"
                status={systemHealth?.render_server_connected ?? false}
                detail={systemHealth?.render_server_detail ?? '—'}
              />
              <HealthItem
                label="Almacenamiento"
                status={systemHealth?.storage_ok ?? false}
                detail={systemHealth?.storage_ok ? 'OK' : (systemHealth?.storage_detail ?? '—')}
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
    <div className="flex items-center gap-3 rounded-lg p-3" style={{ backgroundColor: 'rgba(30,41,59,0.5)' }}>
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: status ? '#00FFAB' : '#FF8C00' }}
      />
      <div>
        <p className="text-sm font-medium" style={{ color: '#c4c6cd' }}>{label}</p>
        <p className="text-xs" style={{ color: '#8e9197' }}>{detail}</p>
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

function BusinessMetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
      <p className="text-sm" style={{ color: '#c4c6cd' }}>{label}</p>
      <p className="text-2xl font-bold mt-2" style={{ color }}>{value}</p>
    </div>
  );
}

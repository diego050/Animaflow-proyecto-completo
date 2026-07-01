import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { BarChart3, Coins, Cpu, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface Metrics {
  period: string;
  total_generations: number;
  valid: number;
  fallback: number;
  fallback_rate: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  by_model: Record<string, number>;
  tokens: { in: number; out: number; total: number; avg_total_per_gen: number };
  cost_usd: { total: number; by_model: Record<string, number>; avg_per_gen: number };
  per_video: { videos: number; avg_cost: number; max_cost: number; avg_scenes: number; avg_seconds: number };
  per_scene: { avg_cost: number; max_cost: number };
  per_second: { total_seconds: number; cost_per_second: number };
}

const PERIODS: [string, string][] = [['week', 'Semana'], ['month', 'Mes'], ['all', 'Total']];

const fmt = (n: number) => n.toLocaleString('es');

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-5">
      <div className="flex items-center gap-2 text-text-secondary/60 text-xs uppercase tracking-wider mb-2">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      {sub && <div className="text-xs text-text-secondary/50 mt-1">{sub}</div>}
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-text-secondary/50">Sin datos aún.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between text-sm">
              <span className="text-text-secondary/80 font-mono text-xs">{k || '—'}</span>
              <span className="text-text-primary font-medium">{fmt(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminAnimationMetrics() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setM(await api.get<Metrics>(`/api/admin/animations/metrics?period=${period}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando métricas');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 size={22} className="text-mint-precision" /> Métricas de animaciones (code-gen)
          </h1>
          <p className="text-sm text-text-secondary/60 mt-1">Tokens, costo estimado y calidad de generación.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-tech overflow-hidden">
            {PERIODS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  period === key ? 'bg-mint-precision text-deep-slate' : 'bg-surface-high text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 bg-surface-high border border-border-tech text-text-primary px-3 py-2 rounded-lg hover:border-mint-precision disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && !m && <p className="text-text-secondary/60">Cargando…</p>}

      {m && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card icon={<Cpu size={13} />} label="Generaciones" value={fmt(m.total_generations)}
              sub={`${fmt(m.valid)} válidas`} />
            <Card icon={<AlertTriangle size={13} />} label="Fallback" value={`${(m.fallback_rate * 100).toFixed(1)}%`}
              sub={`${fmt(m.fallback)} escenas`} />
            <Card icon={<Coins size={13} />} label="Costo total" value={`$${m.cost_usd.total.toFixed(4)}`}
              sub={`~$${m.cost_usd.avg_per_gen.toFixed(5)}/gen`} />
            <Card icon={<BarChart3 size={13} />} label="Tokens" value={fmt(m.tokens.total)}
              sub={`~${fmt(m.tokens.avg_total_per_gen)}/gen`} />
          </div>

          {/* Promedios por video / escena / segundo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card icon={<Coins size={13} />} label="Costo prom./video" value={`$${m.per_video.avg_cost.toFixed(5)}`}
              sub={`${fmt(m.per_video.videos)} videos · ~${m.per_video.avg_scenes} escenas`} />
            <Card icon={<AlertTriangle size={13} />} label="Máx. costo/video" value={`$${m.per_video.max_cost.toFixed(5)}`}
              sub={`~${m.per_video.avg_seconds}s de media`} />
            <Card icon={<Coins size={13} />} label="Costo prom./escena" value={`$${m.per_scene.avg_cost.toFixed(6)}`}
              sub={`máx $${m.per_scene.max_cost.toFixed(5)}/escena`} />
            <Card icon={<BarChart3 size={13} />} label="Costo por segundo" value={`$${m.per_second.cost_per_second.toFixed(6)}`}
              sub={`${fmt(Math.round(m.per_second.total_seconds))}s generados`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Breakdown title="Por modelo" data={m.by_model} />
            <Breakdown title="Por fuente" data={m.by_source} />
            <Breakdown title="Por estado" data={m.by_status} />
          </div>

          {Object.keys(m.cost_usd.by_model || {}).length > 0 && (
            <div className="bg-surface-container border border-border-tech rounded-xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Costo por modelo (USD)</h3>
              <ul className="space-y-1.5">
                {Object.entries(m.cost_usd.by_model).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-sm">
                    <span className="text-text-secondary/80 font-mono text-xs">{k}</span>
                    <span className="text-mint-precision font-medium">${v.toFixed(5)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

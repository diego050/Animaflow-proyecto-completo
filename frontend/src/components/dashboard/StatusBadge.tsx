import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
} from 'lucide-react';

type StatusCategory =
  | 'processing'
  | 'ready'
  | 'rendering'
  | 'completed'
  | 'failed';

const STATUS_MAP: Record<string, { label: string; category: StatusCategory }> = {
  pending: { label: 'Pendiente', category: 'processing' },
  segmenting: { label: 'Segmentando', category: 'processing' },
  visuals_generating: { label: 'Generando visuales', category: 'processing' },
  processing_scenes: { label: 'Procesando escenas', category: 'processing' },
  completed: { label: 'Listo para renderizar', category: 'ready' },
  queued_render: { label: 'En cola de render', category: 'rendering' },
  rendering: { label: 'Renderizando', category: 'rendering' },
  completed_video: { label: 'Completado', category: 'completed' },
  failed: { label: 'Error', category: 'failed' },
  failed_render: { label: 'Error de render', category: 'failed' },
};

const CATEGORY_STYLES: Record<StatusCategory, string> = {
  processing:
    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ready:
    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  rendering:
    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed:
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed:
    'bg-red-500/10 text-red-400 border-red-500/20',
};

const CATEGORY_ICONS: Record<StatusCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  processing: Loader2,
  ready: Play,
  rendering: Loader2,
  completed: CheckCircle2,
  failed: AlertTriangle,
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'sm', showIcon = true }: StatusBadgeProps) {
  const info = STATUS_MAP[status] ?? { label: status, category: 'processing' };
  const Icon = CATEGORY_ICONS[info.category];
  const styles = CATEGORY_STYLES[info.category];

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  const isSpinning = info.category === 'processing' || info.category === 'rendering';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${styles} ${sizeClasses}`}
    >
      {showIcon && (
        <Icon
          size={12}
          className={isSpinning ? 'animate-spin' : ''}
        />
      )}
      {info.label}
    </span>
  );
}

export function getStatusCategory(status: string): StatusCategory {
  return STATUS_MAP[status]?.category ?? 'processing';
}

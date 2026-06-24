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
    'bg-steel-blue/20 text-text-secondary border-steel-blue/30',
  ready:
    'bg-cadmium-orange/10 text-cadmium-orange border-cadmium-orange/20',
  rendering:
    'bg-cadmium-orange/10 text-cadmium-orange border-cadmium-orange/20',
  completed:
    'bg-mint-precision/10 text-mint-precision border-mint-precision/20',
  failed:
    'bg-error/10 text-error border-error/20',
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


